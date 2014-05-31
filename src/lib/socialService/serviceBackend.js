const Lang = imports.lang;

const ServiceBackend = new Lang.Class({
    Name: "SocialServiceServiceBackend",
    Abstract: true,

    _init: function(params) {

    },

    getName: function() {
        //Virtual
    },

    createRestCall: function(authorizer) {
        //Virtual
    },

    isTokenInvalid: function(restCall, parsedPayload) {
        //Virtual
    },

    isInvalidCall: function(restCall, parsedPayload) {
        //Virtual
    },

    getCallResultCode: function(restCall, parsedPayload) {
        //Virtual
    },

    getCallResultMessage: function(restCall, parsedPayload) {
        //Virtual
    },

    callAsync: function(authorizer, method, func, params, callback, cancellable, mustRefreshToken) {
        mustRefreshToken = mustRefreshToken || true;
        cancellable = cancellable || null;

        let restCall = this.createRestCall(authorizer);

        method = method.toUpperCase();
        restCall.set_method(method);

        for (let key in params) {
            restCall.add_param(key, params[key].toString());
        }

        restCall.set_function(func);

        log("DEBUG: " + this.getName() + ": " + func);

        restCall.invoke_async(cancellable, Lang.bind(this, function(call, result) {
            let data = JSON.parse(call.get_payload());

            if (this.isInvalidCall(call, data)) {
                callback(authorizer, data, {
                    code: this.getCallResultCode(call, data),
                    message: this.getCallResultMessage(call, data)
                });
            } else if (this.isTokenInvalid(call, data)) {
                if (mustRefreshToken) {
                    //Unauthorized token error, we need to refresh the token
                    log("DEBUG: " + this.getName() + ": The token is not authorized, refreshing token");
                    authorizer.refresh_authorization(cancellable);
                    this.callAsync(authorizer, method, func, params, callback, cancellable, false);
                } else {
                    callback(authorizer, data, {
                        code: 401,
                        message: "The access token is not authorized to perform the operation"
                    });
                }
            } else {
                callback(authorizer, data, null);
            }
        }));
    },

    performCheckInAsync: function(authorizer, checkIn, callback, cancellable) {
        callback = callback || function() {};
        this.internalPerformCheckInAsync(authorizer, checkIn, callback, cancellable);
    },

    internalPerformCheckInAsync: function(authorizer, checkIn, callback, cancellable) {
        //Virtual
    },

    getPlacesAsync: function(authorizer, latitude, longitude, distance, callback, cancellable) {
        callback = callback || function() {};
        this.internalGetPlacesAsync(
            authorizer,
            latitude,
            longitude,
            distance,
            Lang.bind(this, function(authorizer, data, error) {
                if (error == null) {
                    callback(authorizer, this.createPlaces(data), error);
                } else {
                    callback(authorizer, [], error);
                }
            }),
            cancellable
        );
    },

    internalGetPlacesAsync: function(authorizer, latitude, longitude, distance, callback, cancellable) {
        //Virtual
    },

    createPlaces: function(rawData) {
        //Virtual
    }

});

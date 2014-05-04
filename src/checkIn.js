const Lang = imports.lang;
const Signals = imports.signals;

const Goa = imports.gi.Goa;
const GFBGraph = imports.gi.GFBGraph;

const CheckInManager = new Lang.Class({
    Name: 'SourceManager',

    _init: function(params) {
        this._goaClient = Goa.Client.new_sync(null);
        this._accounts = [];
        this._facebookAuthorizers = [];

        this._goaClient.connect('account-added', Lang.bind(this, this._refreshGoaAccounts));
        this._goaClient.connect('account-changed', Lang.bind(this, this._refreshGoaAccounts));
        this._goaClient.connect('account-removed', Lang.bind(this, this._refreshGoaAccounts));

        this._refreshGoaAccounts();
    },

    _refreshGoaAccounts: function() {
        let accounts = this._goaClient.get_accounts();
        this._accounts = [];
        this._facebookAuthorizers = [];

        accounts.forEach(Lang.bind(this, function(object) {
            if (!object.get_account())
                return;

            if (!object.get_check_in())
                return;

            this._accounts.push(object);

            if (object.get_account().provider_type === "facebook") {
                this._facebookAuthorizers.push(new GFBGraph.GoaAuthorizer({ goa_object: object }));
            }
        }));

        this.emit("accounts-refreshed");
    },

    getFacebookAuthorizers: function() {
        return this._facebookAuthorizers;
    },

    facebookCallAsync: function(authorizer, method, func, params, callback, mustRefreshToken) {
        mustRefreshToken = mustRefreshToken || true;

        let restCall = GFBGraph.new_rest_call(authorizer);

        method = method.toUpperCase();
        restCall.set_method(method);

        for (let key in params) {
            restCall.add_param(key, params[key]);
        }

        restCall.set_function(func);

        log("DEBUG: Facebook Call: " + func);

        restCall.invoke_async(null, Lang.bind(this, function(call, result) {
            let data = JSON.parse(call.get_payload());

            if (data.error && (data.error.code == 2500 || data.error.code == 104)) {
                if (mustRefreshToken) {
                    //Unauthorized token error, we need to refresh the token
                    log("DEBUG: Facebook Call: The token is not authorized, refreshing token");
                    authorizer.refresh_authorization(null);
                    this.facebookCallAsync(authorizer, method, func, params, callback, false);
                } else {
                    callback(authorizer, data, {
                        code: 2500,
                        message: "The access token is not authorized to perform the operation"
                    });
                }
            } else {
                callback(authorizer, data, null);
            }
        }));
    },

    performCheckInAsync: function(authorizer, checkIn, callback) {
        callback = callback || function() {};

        this.facebookCallAsync(
            authorizer,
            "POST",
            "me/feed",
            {
                "message": checkIn.message,
                "place": checkIn.facebookPlaceId
            },
            callback
        );
    },

    getFacebookPlacesAsync: function(latitude, longitude, distance, callback) {
        this.facebookCallAsync(
            this._facebookAuthorizers[0],
            "GET",
            "search",
            {
                "type": "place",
                "center": latitude + "," + longitude,
                "distance": distance
            },
            callback
        );
    }
});
Signals.addSignalMethods(CheckInManager.prototype);

const CheckIn = new Lang.Class({
    Name: "CheckIn",

    message: null,

    facebookPlaceId: null,
});

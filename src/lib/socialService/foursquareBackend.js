const Lang = imports.lang;

const SocialService = imports.socialService;

const FoursquareBackend = new Lang.Class({
    Name: "SocialService.FoursquareBackend",
    Extends: SocialService.serviceBackend.ServiceBackend,

    getName: function() {
        return "foursquare";
    },

    createRestCall: function(authorizer) {
        return SocialService.foursquareGoaAuthorizer.new_rest_call(authorizer);
    },

    isTokenInvalid: function(restCall, data) {
        return data.meta.code == 401 || data.meta.code == 403;
    },

    isInvalidCall: function(restCall, data) {
        return data.meta.code != 200;
    },

    getCallResultCode: function(restCall, data) {
        return data.meta.code;
    },

    getCallResultMessage: function(restCall, data) {
        return data.meta.errorDetail;
    },

    internalPerformCheckInAsync: function(authorizer, checkIn, callback, cancellable) {
        this.callAsync(
            authorizer,
            "POST",
            "checkins/add",
            {
                "shout": checkIn.message,
                "venueId": checkIn.place.getId()
            },
            callback,
            cancellable
        );
    },

    internalGetPlacesAsync: function(authorizer, latitude, longitude, distance, callback, cancellable) {
        this.callAsync(
            authorizer,
            "GET",
            "venues/search",
            {
                "ll": latitude + "," + longitude,
                "radius": distance
            },
            callback,
            cancellable
        );
    },

    createPlaces: function(rawData) {
        let places = [];

        for (let i in rawData.response.venues) {
            let place = rawData.response.venues[i];

            places.push(new SocialService.place.Place({
                "id": place.id,
                "name": place.name,
                "category": place.categories.length > 0?
                    place.categories[0].name:
                    null,
                "originalData": place,
            }));
        }

        return places;
    }

});

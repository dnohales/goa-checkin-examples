const Lang = imports.lang;

const SocialService = imports.socialService;

const FoursquareBackend = new Lang.Class({
    Name: "SocialServiceFoursquareBackend",
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
        return data == null || data.meta.code != 200;
    },

    getCallResultCode: function(restCall, data) {
        return data == null? restCall.get_status_code():data.meta.code;
    },

    getCallResultMessage: function(restCall, data) {
        return data == null? restCall.get_status_message():data.meta.errorDetail;
    },

    internalPerformCheckInAsync: function(authorizer, checkIn, callback, cancellable) {
        let broadcast = checkIn.privacy;

        if (checkIn.broadcastFacebook) {
            broadcast += ",facebook";
        }

        if (checkIn.broadcastTwitter) {
            broadcast += ",twitter";
        }

        this.callAsync(
            authorizer,
            "POST",
            "checkins/add",
            {
                "shout": checkIn.message,
                "venueId": checkIn.place.id,
                "broadcast": broadcast
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
                "radius": distance,
                "intent": "checkin"
            },
            callback,
            cancellable
        );
    },

    createPlaces: function(rawData) {
        let places = [];

        for (let i in rawData.response.venues) {
            let place = rawData.response.venues[i];

            places.push(new SocialService.socialPlace.SocialPlace({
                id: place.id,
                name: place.name,
                latitude: place.location.lat,
                longitude: place.location.lng,
                category: place.categories.length > 0?
                    place.categories[0].name:
                    null,
                link: "https://foursquare.com/v/foursquare-hq/" + place.id,
                originalData: place,
            }));
        }

        return places;
    }

});

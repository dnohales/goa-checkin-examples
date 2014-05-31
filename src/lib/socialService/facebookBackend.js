const GFBGraph = imports.gi.GFBGraph;
const Lang = imports.lang;

const SocialService = imports.socialService;

const FacebookBackend = new Lang.Class({
    Name: "SocialServiceFacebookBackend",
    Extends: SocialService.serviceBackend.ServiceBackend,

    getName: function() {
        return "facebook";
    },

    createRestCall: function(authorizer) {
        return GFBGraph.new_rest_call(authorizer);
    },

    isTokenInvalid: function(restCall, data) {
        return data.error &&
               (data.error.code == 2500 || data.error.code == 104 || data.error.code == 190);
    },

    isInvalidCall: function(restCall, data) {
        return data == null || data.error;
    },

    getCallResultCode: function(restCall, data) {
        return data == null?
            restCall.get_status_code():
            (data.error? data.error.code:null);
    },

    getCallResultMessage: function(restCall, data) {
        return data == null?
            restCall.get_status_message():
            (data.error? data.error.message:null);
    },

    internalPerformCheckInAsync: function(authorizer, checkIn, callback, cancellable) {
        this.callAsync(
            authorizer,
            "POST",
            "me/feed",
            {
                "message": checkIn.message,
                "place": checkIn.place.id
            },
            callback,
            cancellable
        );
    },

    internalGetPlacesAsync: function(authorizer, latitude, longitude, distance, callback, cancellable) {
        this.callAsync(
            authorizer,
            "GET",
            "search",
            {
                "type": "place",
                "center": latitude + "," + longitude,
                "distance": distance
            },
            callback,
            cancellable
        );
    },

    createPlaces: function(rawData) {
        let places = [];

        for (let i in rawData.data) {
            let place = rawData.data[i];
            places.push(new SocialService.socialPlace.SocialPlace({
                id: place.id,
                name: place.name,
                latitude: place.location.latitude,
                longitude: place.location.longitude,
                category: place.category,
                link: "https://www.facebook.com/" + place.id,
                originalData: place,
            }));
        }

        return places;
    }

});

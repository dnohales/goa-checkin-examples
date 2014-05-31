const Geocode = imports.gi.GeocodeGlib;

const Lang = imports.lang;

const SocialPlace = new Lang.Class({
    Name: "SocialServiceSocialPlace",

    _init: function(params) {
        this.id = params.id;
        this.name = params.name;
        this.latitude = params.latitude;
        this.longitude = params.longitude;
        this.category = params.category;
        this.link = params.link;
        this.originalData = params.originalData;
    },

    get location() {
        return new Geocode.Location({
            latitude: parseFloat(this.latitude),
            longitude: parseFloat(this.longitude)
        });
    },

    getOriginalData: function() {
        return this._originalData;
    }
});

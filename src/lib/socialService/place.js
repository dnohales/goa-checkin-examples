const Lang = imports.lang;

const Place = new Lang.Class({
    Name: "SocialService.Place",

    _init: function(params) {
        if (!params.id || !params.name || !params.originalData) {
            logError("SocialService.Place id, name, category, originalData " + 
                      "construction parameters are required");
            return;
        }

        this._id = params.id;
        this._name = params.name;
        this._category = params.category;
        this._originalData = params.originalData;
    },

    getId: function() {
        return this._id;
    },

    getName: function() {
        return this._name;
    },

    getCategory: function() {
        return this._category;
    },

    getOriginalData: function() {
        return this._originalData;
    }
});

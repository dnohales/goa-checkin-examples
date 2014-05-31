const Lang = imports.lang;
const Signals = imports.signals;

const Goa = imports.gi.Goa;
const GFBGraph = imports.gi.GFBGraph;
const SocialService = imports.socialService;
const FoursquareGoaAuthorizer = SocialService.foursquareGoaAuthorizer.FoursquareGoaAuthorizer;
const FacebookBackend = SocialService.facebookBackend.FacebookBackend;
const FoursquareBackend = SocialService.foursquareBackend.FoursquareBackend;

const CheckInManager = new Lang.Class({
    Name: 'CheckInManager',

    _init: function(params) {
        this._goaClient = Goa.Client.new_sync(null);
        this._accounts = [];
        this._authorizers = {};
        this._backends = {};

        this._initBackends();

        this._goaClient.connect('account-added', Lang.bind(this, this._refreshGoaAccounts));
        this._goaClient.connect('account-changed', Lang.bind(this, this._refreshGoaAccounts));
        this._goaClient.connect('account-removed', Lang.bind(this, this._refreshGoaAccounts));

        this._refreshGoaAccounts();
    },

    _initBackends: function() {
        let backendsArray = [];

        backendsArray.push(new FacebookBackend());
        backendsArray.push(new FoursquareBackend());

        for (let i in backendsArray) {
            let backend = backendsArray[i];
            this._backends[backend.getName()] = backend;
        }
    },

    _refreshGoaAccounts: function() {
        let accounts = this._goaClient.get_accounts();
        this._accounts = [];
        this._accountsCount = 0;
        this._authorizers = {};

        accounts.forEach(Lang.bind(this, function(object) {
            if (!object.get_account())
                return;

            if (!object.get_maps())
                return;

            let accountId = object.get_account().id;
            this._accounts.push(object);

            if (object.get_account().provider_type == "facebook") {
                this._authorizers[accountId] = new GFBGraph.GoaAuthorizer({ goa_object: object });
            } else if (object.get_account().provider_type == "foursquare") {
                this._authorizers[accountId] = new FoursquareGoaAuthorizer({ goa_object: object });
            } else {
                //not reached
            }
        }));

        this.emit("accounts-refreshed");
    },

    getClient: function() {
        return this._goaClient;
    },

    getAccounts: function() {
        return this._accounts;
    },

    isCheckInAvailable: function() {
        return this._accounts.length > 0;
    },

    getAuthorizers: function() {
        return this._authorizers;
    },

    getAuthorizerForAccount: function(account) {
        return this.getAuthorizerForAccountId(account.get_account().id);
    },

    getAuthorizerForAccountId: function(accountId) {
        return this._authorizers[accountId];
    },

    getBackendForAuthorizer: function(authorizer) {
        return this._backends[authorizer.goa_object.get_account().provider_type];
    },

    performCheckInAsync: function(authorizer, checkIn, callback, cancellable) {
        this.getBackendForAuthorizer(authorizer)
            .performCheckInAsync(authorizer, checkIn, callback, cancellable);
    },

    getPlacesAsync: function(authorizer, latitude, longitude, distance, callback, cancellable) {
        this.getBackendForAuthorizer(authorizer)
            .getPlacesAsync(authorizer, latitude, longitude, distance, callback, cancellable);
    }
});
Signals.addSignalMethods(CheckInManager.prototype);

const CheckIn = new Lang.Class({
    Name: "CheckIn",

    message: null,

    place: null,

    privacy: null,

    broadcastFacebook: false,

    broadcastTwitter: false
});

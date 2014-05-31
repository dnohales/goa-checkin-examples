const Geocode = imports.gi.GeocodeGlib;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Goa = imports.gi.Goa;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;

const Lang = imports.lang;
const Mainloop = imports.mainloop
const Signals = imports.signals;
const System = imports.system;
const CheckIn = imports.checkIn;
const Utils = imports.utils;
const _ = imports.gettext.gettext;

const CheckInManager = new CheckIn.CheckInManager();
String.prototype.format = imports.format.format;

const AccountListModelColumn = {
    SORT_KEY: 0,
    OBJECT: 1,
    ATTENTION_NEEDED: 2,
    MARKUP: 3,
    ICON: 4,
    types: [
        GObject.TYPE_STRING,
        Goa.Object,
        GObject.TYPE_BOOLEAN,
        GObject.TYPE_STRING,
        Gio.Icon
    ]
};

const AccountListModel = new Lang.Class({
    Name: "AccountListModel",
    Extends: Gtk.ListStore,

    _init: function(params) {
        this.parent();

        this.set_column_types(AccountListModelColumn.types);
        this.set_sort_column_id(AccountListModelColumn.SORT_KEY, Gtk.SortType.ASCENDING);

        CheckInManager.connect('accounts-refreshed', this.refresh.bind(this));

        this.refresh();
    },

    refresh: function() {
        let accounts = CheckInManager.getAccounts();

        this.clear();
        accounts.forEach(this._addAccount.bind(this));
    },

    getAccountForPath: function(path) {
        let iter = this.get_iter(path)[1];
        return this.get_value(iter, AccountListModelColumn.OBJECT);
    },

    _setValues: function(goaObject, iter) {
        let account = goaObject.get_account();

        let icon = Gio.Icon.new_for_string(account.provider_icon);
        let markup = '<b>%s</b>\n<small>%s</small>'.format(
            account.provider_name,
            account.presentation_identity
        );

        this.set_value(iter, AccountListModelColumn.SORT_KEY, account.id);
        this.set_value(iter, AccountListModelColumn.OBJECT, goaObject);
        this.set_value(iter, AccountListModelColumn.ATTENTION_NEEDED, account.attention_needed);
        this.set_value(iter, AccountListModelColumn.MARKUP, markup);
        this.set_value(iter, AccountListModelColumn.ICON, icon);
    },

    _addAccount: function(goaObject) {
        let iter = this.insert(-1);
        this._setValues(goaObject, iter);
    }
});

const SocialPlaceListModelColumn = {
    OBJECT: 0,
    MARKUP: 1,
    IS_SHOW_MORE_RESULTS: 2,
    types: [
        //TODO: not needed, Gjs object GType in list model
        GObject.TYPE_STRING,
        GObject.TYPE_STRING,
        GObject.TYPE_BOOLEAN
    ]
};

const SocialPlaceListModel = new Lang.Class({
    Name: "SocialPlaceListModel",
    Extends: Gtk.ListStore,

    _init: function() {
        this.parent();

        this.set_column_types(SocialPlaceListModelColumn.types);
    },

    initView: function(treeview) {
        treeview.connect("row-activated", (function(view, path, column, userData) {
            if (path != null) {
                let iter = this.get_iter(path)[1];
                if (this.get_value(iter, SocialPlaceListModelColumn.IS_SHOW_MORE_RESULTS)) {
                    //"Show more results" item
                    //We need to remove the "Show more results" after
                    //a time out to avoid trigger row-activated in a
                    //new created row
                    GLib.timeout_add(0, 10, (function() {
                        this.remove(iter);
                        this._showBadMatches();
                    }).bind(this), null);
                }
            }
        }).bind(this));
    },

    setMatches: function(matches) {
        this.clear();

        this._matches = matches;

        if (this._matches.exactMatches.length +
            this._matches.goodMatches.length == 0) {
            this._showBadMatches();
        } else {
            this._matches.exactMatches.forEach(this._addPlace.bind(this));
            this._matches.goodMatches.forEach(this._addPlace.bind(this));

            if (this._matches.badMatches.length > 0) {
                this._addMoreResults();
            }
        }
    },

    getPlaceForPath: function(path) {
        let iter = this.get_iter(path)[1];

        if (this.get_value(iter, SocialPlaceListModelColumn.IS_SHOW_MORE_RESULTS)) {
            return null;
        } else {
            return this.get_value(iter, SocialPlaceListModelColumn.OBJECT);
        }
    },

    _showBadMatches: function() {
        this._matches.badMatches.forEach(this._addPlace.bind(this));
    },

    _setValues: function(place, iter) {
        let markup = '<b>%s</b>\n<small>%s</small>'.format(
            place.name,
            place.name
        );

        //TODO: not needed, Gjs object GType in list model
        this.set_value(iter, SocialPlaceListModelColumn.OBJECT, place.id);
        this.set_value(iter, SocialPlaceListModelColumn.MARKUP, markup);
        this.set_value(iter, SocialPlaceListModelColumn.IS_SHOW_MORE_RESULTS, false);
    },

    _addPlace: function(place) {
        let iter = this.insert(-1);
        this._setValues(place, iter);
    },

    _addMoreResults: function() {
        let iter = this.insert(-1);

        let markup = '<span foreground="#777777">' + _('Show more results') + '</span>';

        this.set_value(iter, SocialPlaceListModelColumn.OBJECT, "");
        this.set_value(iter, SocialPlaceListModelColumn.MARKUP, markup);
        this.set_value(iter, SocialPlaceListModelColumn.IS_SHOW_MORE_RESULTS, true);
    }
});

const SocialPlaceMatcher = {

    min: function(values) {
        if (values.length == 2) {
            return values[0] < values[1]? values[0]:values[1];
        }

        return SocialPlaceMatcher.min([values[0], SocialPlaceMatcher.min(values.slice(1))]);
    },

    getLevenshteinDistance: function(a, b) {
        let i;
        let j;
        let d = new Array();

        for (i = 0; i <= a.length; i++) {
            d[i] = new Array();
            for (j = 0; j <= b.length; j++) {
                d[i][j] = 0;
            }
        }

        for (i = 1; i <= a.length; i++) {
            d[i][0] = i;
        }

        for (j = 1; j <= b.length; j++) {
            d[0][j] = j;
        }

        for (j = 1; j <= b.length; j++) {
            for (i = 1; i <= a.length; i++) {
                if (a[i] == b[j]) {
                    d[i][j] = d[i-1][j-1];
                } else {
                    d[i][j] = SocialPlaceMatcher.min([
                        d[i-1][j] + 1,
                        d[i][j-1] + 1,
                        d[i-1][j-1] + 1
                    ]);
                }
            }
        }

        return d[a.length][b.length];
    },

    _normalize: function(name) {
        return name.toLowerCase().trim().replace(/ +(?= )/g,'');
    },

    getPlacesLevenshteinDistance: function(geoPlace, socialPlace) {
        let a = geoPlace.name;
        let b = socialPlace.name;

        return this.getLevenshteinDistance(this._normalize(a), this._normalize(b));
    },

    /**
     * @return 0 for bad match, 1 for good match and 2
     * exact match.
     */
    getKindOfMatch: function(geoPlace, socialPlace) {
        let distance = geoPlace.location.get_distance_from(socialPlace.location);
        let levenshtein = this.getPlacesLevenshteinDistance(geoPlace, socialPlace);

        if (distance < 0.01 && levenshtein <= 2) {
            return 2;
        } else if (distance < 0.03 && levenshtein <= 5) {
            return 1;
        } else {
            return 0;
        }
    },

    match: function(geoPlace, socialPlaces) {
        let result = {
            exactMatches: [],
            goodMatches: [],
            badMatches: []
        };

        socialPlaces.forEach(function(p) {
            let cat = p.name;
            p._category = cat +
                          " " +
                          geoPlace.location.get_distance_from(p.location) + 
                          " " +
                          SocialPlaceMatcher.getLevenshteinDistance(geoPlace.name, p.name);

        });

        socialPlaces.sort(function(a, b) {
            let da = geoPlace.location.get_distance_from(a.location);
            let db = geoPlace.location.get_distance_from(b.location);

            if (da > db) {
                return 1;
            } else if (da < db) {
                return -1;
            }

            return 0;
        });

        socialPlaces.forEach(function(place) {
            let match = SocialPlaceMatcher.getKindOfMatch(geoPlace, place);

            switch (match)
            {
            case 0:
                result.badMatches.push(place);
                break;

            case 1:
                result.goodMatches.push(place);
                break;

            case 2:
                result.exactMatches.push(place);
                break;
            }
        });

        return result;
    }
};

const CheckInDialogResponse = {
    SUCCESS: 0,
    CANCELLED: 2,
    FAILURE_GET_PLACES: 3,
    FAILURE_ACCOUNT_DISABLED: 4,
    FAILURE_CHECKIN_DISABLED: 5
};

const CheckInDialog = new Lang.Class({
    Name: "CheckInDialog",
    Extends: Gtk.Dialog,

    _init: function(params) {
        this.parent({
            'width-request': 500,
            'use-header-bar': true
        });

        this.get_style_context().add_class('maps-check-in');

        this._account = null;
        this._authorizer = null;
        this._checkIn = new CheckIn.CheckIn();
        this._place = params.place;
        //TODO: not needed, Gjs object GType in list model
        this._socialPlaces = null;
        this._ui = this._initGtkBuilder();

        this._cancellable = new Gio.Cancellable();
        this._cancellable.connect((function() {
            this.emit("response", CheckInDialogResponse.CANCELLED);
        }).bind(this));

        CheckInManager.connect("accounts-refreshed", this._onAccountRefreshed.bind(this));

        this._initHeaderBar();
        this._initWidgets();
    },

    _initHeaderBar: function() {
        this.get_header_bar().show_close_button = false;

        let cancelButton = new Gtk.Button({ label: _("Cancel") });
        this.get_header_bar().pack_start(cancelButton, true, true, 0);
        cancelButton.connect("clicked", (function() {
            this._cancellable.cancel();
        }).bind(this));

        this._doneButton = new Gtk.Button({
            label: _("Done"),
        });
        this._doneButton.get_style_context().add_class('suggested-action');
        this.get_header_bar().pack_end(this._doneButton, true, true, 0);
        this._doneButton.hide();
        this._doneButton.connect("clicked", (function() {
            this.startCheckInStep();
        }).bind(this));
    },

    _initWidgets: function() {
        this._stack = new Gtk.Stack();
        this._stack.set_homogeneous(true);
        this._stack.set_transition_type(Gtk.StackTransitionType.CROSSFADE);

        this.get_content_area().pack_start(this._stack, true, true, 0);

        this._stack.add_named(this._ui.get_object("box-account"), "account");
        this._stack.add_named(this._ui.get_object("box-place"), "place");
        this._stack.add_named(this._ui.get_object("box-loading"), "loading");
        this._stack.add_named(this._ui.get_object("box-message"), "message");

        this._initAccountsTreeView();
        this._initPlacesTreeView();

        this._placeNotFoundLabel = this._ui.get_object("label-place-not-found");
        this._messageInfoLabel = this._ui.get_object("label-message-info");
        this._messageTextView = this._ui.get_object("textview-message");
    },

    _initAccountsTreeView: function() {
        let accountsTreeView = this._ui.get_object("treeview-accounts");
        accountsTreeView.set_model(new AccountListModel({
            client: CheckInManager.getClient()
        }));

        let column = new Gtk.TreeViewColumn();
        accountsTreeView.append_column(column);

        let renderer = new Gtk.CellRendererPixbuf();
        column.pack_start(renderer, false);
        renderer.follow_state = true;
        renderer.stock_size = Gtk.IconSize.DIALOG;
        column.add_attribute(renderer, "gicon", AccountListModelColumn.ICON);

        renderer = new Gtk.CellRendererText();
        column.pack_start(renderer, false);
        renderer.width_chars = 30;
        column.add_attribute(renderer, "markup", AccountListModelColumn.MARKUP);

        renderer = new Gtk.CellRendererPixbuf();
        column.pack_start(renderer, false);
        renderer.icon_name = "dialog-warning-symbolic";
        renderer.xalign = 1.0;
        renderer.xpad = 10;
        column.add_attribute(renderer, "visible", AccountListModelColumn.ATTENTION_NEEDED);

        accountsTreeView.connect("row-activated", (function(view, path, column, userData) {
            if (path != null) {
                this.setAccount(view.get_model().getAccountForPath(path));
                this.startPlaceStep()
            }
        }).bind(this));
    },

    _initPlacesTreeView: function() {
        this._placesTreeView = this._ui.get_object("treeview-places");
        let model = new SocialPlaceListModel();
        this._placesTreeView.set_model(model);
        model.initView(this._placesTreeView);

        let column = new Gtk.TreeViewColumn();
        this._placesTreeView.append_column(column);

        let renderer = new Gtk.CellRendererText();
        column.pack_start(renderer, false);
        renderer.width_chars = 30;
        column.add_attribute(renderer, "markup", SocialPlaceListModelColumn.MARKUP);

        this._placesTreeView.connect("row-activated", (function(view, path, column, userData) {
            if (path != null) {
                let place = view.get_model().getPlaceForPath(path);
                if (place != null) {
                    //TODO: not needed, Gjs object GType in list model
                    let placeId = place;
                    for (let i in this._socialPlaces) {
                        if (this._socialPlaces[i].id == placeId) {
                            place = this._socialPlaces[i];
                            break;
                        }
                    }
                    //END TODO
                    this._checkIn.place = place;
                    this.startMessageStep();
                }
            }
        }).bind(this));
    },

    _initGtkBuilder: function() {
        let builder = new Gtk.Builder();
        builder.add_from_file('check-in.ui');
        return builder;
    },

    vfunc_show: function() {
        this.parent();
        Utils.loadStyleSheet("style.css");
        this.show_all();
        this._doneButton.hide();
        this.startup();
    },

    startup: function() {
        if (CheckInManager.getAccounts().length > 1) {
            this.startAccountStep();
        } else {
            this.setAccount(CheckInManager.getAccounts()[0]);
            this.startPlaceStep();
        }
    },

    _onAccountRefreshed: function() {
        let accounts = CheckInManager.getAccounts();

        if (!CheckInManager.isCheckInAvailable()) {
            this.emit("response", CheckInDialogResponse.FAILURE_CHECKIN_DISABLED);
        } else if (this._account != null) {
            for (let i in accounts) {
                let account = accounts[i];
                if (this._account.get_account().id == accounts[i].get_account().id) {
                    return;
                }
            }

            this.emit("response", CheckInDialogResponse.FAILURE_ACCOUNT_DISABLED);
        }
    },

    setAccount: function(account) {
        this._account = account;
        this._authorizer = CheckInManager.getAuthorizerForAccount(account);
    },

    startAccountStep: function() {
        this.set_title("Select an account");
        this._stack.set_visible_child_name("account");
    },

    startPlaceStep: function() {
        this.set_title("Loading");
        this._stack.set_visible_child_name("loading");

        CheckInManager.getPlacesAsync(
            this._authorizer,
            this._place.location.latitude,
            this._place.location.longitude,
            100,
            (function(authorizer, places, error) {
                if (error == null) {
                    //TODO: not needed, Gjs object GType in list model
                    this._socialPlaces = places;
                    let matches = SocialPlaceMatcher.match(this._place, places);

                    if (matches.exactMatches.length == 1) {
                        this._checkIn.place = matches.exactMatches[0];
                        this.startMessageStep();
                    } else {
                        this.set_title("Select a place");
                        this._placesTreeView.get_model().setMatches(matches);
                        this._placeNotFoundLabel.label = _("Maps could not find the place to check-in in %s, please select one from this list")
                                                        .format(this._account.get_account().provider_name);
                        this._stack.set_visible_child_name("place");
                    }
                } else {
                    printerr(JSON.stringify(error));
                    this.emit("response", CheckInDialogResponse.FAILURE_GET_PLACES);
                }
            }).bind(this),
            this._cancellable
        );
    },

    startMessageStep: function() {
        this.set_title("Put a message");
        this._stack.set_visible_child_name("message");
        this._messageInfoLabel.label = 
            _("You are going to check-in in %s with your %s account. Put a message for the check-in below")
            .format("<a href=\"%s\">%s</a>".format(this._checkIn.place.link,
                                                  this._checkIn.place.name),
                    this._account.get_account().provider_name);

        this._messageTextView.grab_focus();
        this._doneButton.show();
    },

    startCheckInStep: function() {
        //TODO
    }

});

if (ARGV.length != 3) {
    printerr("Usage: gjs dialog.js <placeName> <placeLatitude> <placeLongitude>");
    System.exit(1);
}

let place = new Geocode.Place({
    name: ARGV[0],
    place_type: null,
    location: new Geocode.Location({
        latitude: parseFloat(ARGV[1]),
        longitude: parseFloat(ARGV[2]),
        accuracy: 0
    })
});

Gtk.init(null, 0);

let dialog = new CheckInDialog({
    place: place
});
print("Response: " + dialog.run());
dialog.destroy();

const GLib = imports.gi.GLib;
const Goa = imports.gi.Goa;
const Lang = imports.lang;
const Rest = imports.gi.Rest;

/**
 * This code should be converted to a native library
 * in the near future.
 */
const FoursquareGoaAuthorizer = new Lang.Class({
    Name: 'FoursquareGoaAuthorizer',

    _init: function(params) {
        if (!params.goa_object) {
            logError("FoursquareGoaAuthorizer requires goa_object parameter");
            return;
        }

        //this._mutex = new GLib.Mutex();
        this._goaObject = null;
        this._accessToken = null;

        //this._mutex.init();
        this.goa_object = params.goa_object;
    },

    get goa_object() {
        return this._goaObject;
    },

    set goa_object(object) {
        //this._mutex.lock();

        this._goaObject = object;
        this._accessToken = object.get_oauth2_based().call_get_access_token_sync(null)[1];

        //this._mutex.unlock();
    },

    process_call: function(restCall) {
        //this._mutex.lock();

        restCall.add_param("oauth_token", this._accessToken);
        restCall.add_param("v", "20140226");

        //this._mutex.unlock();
    },

    process_message: function(soupMessage) {
        //this._mutex.lock();

        let uri = soupMessage.get_uri();
        uri.set_query(uri, "oauth_token" + this._accessToken + "&v=20140226");

        //this._mutex.unlock();
    },

    refresh_authorization: function(cancellable) {
        //this._mutex.lock();

        let ret = false;
        let account = this._goaObject.get_account();
        let oauth2 = this._goaObject.get_oauth2_based();

        let ensureCredentialsResult = account.call_ensure_credentials_sync(cancellable);
        if (ensureCredentialsResult[0]) {
            let getAccessTokenResult = account.call_get_access_token_sync(cancellable);
            if (getAccessTokenResult[0]) {
                this._accessToken = getAccessTokenResult[1];
                ret = true;
            }
        }

        //this._mutex.unlock();

        return ret;
    }
});

function new_rest_call(authorizer)
{
    let proxy = new Rest.Proxy({
        url_format: "https://api.foursquare.com/v2",
        binding_required: false
    });
    let restCall = proxy.new_call();

    authorizer.process_call(restCall);

    return restCall;
}

const GLib = imports.gi.GLib;
const Format = imports.format;
const CheckIn = imports.checkIn;
const System = imports.system;
const Console = imports.console;

if (ARGV.length != 5) {
    printerr("Usage: gjs performCheckIn.js <message> <latitude> <longitude> <distance> <place_index>");
    System.exit(1);
}

let manager = new CheckIn.CheckInManager();
manager.getFacebookPlacesAsync(ARGV[1], ARGV[2], ARGV[3], function(authorizer, data, error) {
    if (error == null) {
        let placeIndex = parseInt(ARGV[4]);
        let place = data.data[placeIndex];
        let checkIn = new CheckIn.CheckIn();

        if (!place) {
            printerr("place_index argument is not valid, use listFacebookPlaces script to get all the possible list of places");
            loop.quit();
            return;
        }

        checkIn.message = ARGV[0];
        checkIn.facebookPlaceId = place.id;

        log(Format.vprintf("Selected place: %s: %s (%s)", [place.id, place.name, place.category]));

        //App should decide in which account perform the check-in
        manager.performCheckInAsync(manager.getFacebookAuthorizers()[0], checkIn, function(authorizer, data, error) {
            if (error == null) {
                print("Success! post link: https://www.facebook.com/" + data.id);
            } else {
                logError("Failure: " + error);
            }
            loop.quit();
        });
    } else {
        logError(error);
        loop.quit();
    }
});


let loop = new GLib.MainLoop(null, false);
loop.run();

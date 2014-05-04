const GLib = imports.gi.GLib;
const Format = imports.format;
const CheckIn = imports.checkIn;
const System = imports.system;

if (ARGV.length != 3) {
    printerr("Usage: gjs listFacebookPlaces.js <latitude> <longitude> <distance>");
    System.exit(1);
}

let manager = new CheckIn.CheckInManager();
manager.getFacebookPlacesAsync(ARGV[0], ARGV[1], ARGV[2], function(authorizer, data, error) {
    if (error != "null") {
        print("Places:");
        for (let i in data.data) {
            let place = data.data[i];
            print(Format.vprintf("  %s: %s (%s)", [place.id, place.name, place.category]));
        }
    } else {
        log(error);
    }

    loop.quit();
});

let loop = new GLib.MainLoop(null, false);
loop.run();

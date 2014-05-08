const GLib = imports.gi.GLib;
const Format = imports.format;
const CheckIn = imports.checkIn;
const System = imports.system;

if (ARGV.length != 4) {
    printerr("Usage: gjs listPlaces.js <accountId> <latitude> <longitude> <distance>");
    System.exit(1);
}

let manager = new CheckIn.CheckInManager();

let authorizer = manager.getAuthorizerForAccountId(ARGV[0]);
if (!authorizer) {
    printerr("There is no account with ID " + ARGV[0]);
    System.exit(1);
}

manager.getPlacesAsync(authorizer, ARGV[1], ARGV[2], ARGV[3], function(authorizer, places, error) {
    if (error == null) {
        print("Places:");
        for (let i in places) {
            let place = places[i];
            print(Format.vprintf("  %d: %s: %s (%s)", [i, place.getId(), place.getName(), place.getCategory()]));
        }
    } else {
        log(error);
    }

    loop.quit();
});

let loop = new GLib.MainLoop(null, false);
loop.run();

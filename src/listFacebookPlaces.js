const GLib = imports.gi.GLib;
const Format = imports.format;
const CheckIn = imports.checkIn;

let manager = new CheckIn.CheckInManager();
manager.getFacebookPlacesAsync("-38.011448", "-57.539910", "500", function(authorizer, data, error) {
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

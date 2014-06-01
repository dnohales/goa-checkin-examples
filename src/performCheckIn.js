const GLib = imports.gi.GLib;
const Format = imports.format;
const CheckIn = imports.checkIn;
const System = imports.system;
const Console = imports.console;

if (ARGV.length != 3) {
    printerr('Usage: gjs performCheckIn.js <accountId> <message> <placeId>');
    System.exit(1);
}

let manager = new CheckIn.CheckInManager();

let authorizer = manager.getAuthorizerForAccountId(ARGV[0]);
if (!authorizer) {
    printerr('There is no account with ID ' + ARGV[0]);
    System.exit(1);
}

let checkIn = new CheckIn.CheckIn();
checkIn.message = ARGV[1];
checkIn.place = new imports.socialService.place.Place({
    id: ARGV[2],
    name: 'dummy',
    originalData: {dummy: 'dummy'}
});

manager.performCheckInAsync(authorizer, checkIn, function(authorizer, data, error) {
    if (error == null) {
        print('Success:');
        print(JSON.stringify(data, null, '  '));
    } else {
        printerr('Failure:');
        printerr(JSON.stringify(error, null, '  '));
    }
    loop.quit();
});


let loop = new GLib.MainLoop(null, false);
loop.run();

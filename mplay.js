var spawn = require( 'child_process' ).spawn;
var mplayer;
var file = 'http://relay.forever.fm/all.mp3';

mplayer = spawn( 'mplayer', [ '-slave', file ] );
mplayer.on( 'exit', function () { console.log( 'EXIT.' ); } );

// obviously you'll want something smarter than just logging...
mplayer.stdout.on('data', function (data) { console.log('mplayer stdout: ' + data); });
mplayer.stderr.on('data', function (data) { console.log('mplayer stderr: ' + data); });

setTimeout( pause, 5000 );
setTimeout( pause, 9000 );

function pause() {
    console.log( 'PAUSE' );
    mplayer.stdin.write( 'pausing\n' );
}

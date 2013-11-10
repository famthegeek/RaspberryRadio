var express = require('express');
var redis = require('redis')
var sys = require('sys');
var spawn = require('child_process').spawn;
var publisherClient = redis.createClient();

var app = module.exports = express.createServer();


var file = 'http://lyd.nrk.no/nrk_radio_mp3_mp3_h';
var livedata = {};

livedata.stations = [
{
 name: 'forever.fm',
 stream: 'http://relay.forever.fm/all.mp3',
 description: 'stream of music from soundcloud nonstop'
},
{
 name: 'Nrk Mp3',
 stream: 'http://lyd.nrk.no/nrk_radio_mp3_mp3_h',
 description: 'NRK mP3'
}
];

livedata.nowplaying = {
 stream_id:'0',
 title: '',
 volume: '50'
};

mplayer = spawn( 'mplayer', [ '-slave', file ] );
mplayer.on( 'exit', function () { console.log( 'EXIT.' ); } );

// obviously you'll want something smarter than just logging...
mplayer.stdout.on('data', function (data) {
var data_line = ""+data;

if(data_line.indexOf('A:') != 0){
  console.log(data_line.indexOf('A:'));
}
if(!((data_line.substring(0, 1) == "A")||(data_line.substring(8,9) =="A"))){
  //console.log(data_line.indexOf("Volume"));
  if(data_line.substring(7, 13) == "Volume"){
    var numberPattern = /\d+/g;
    livedata.nowplaying.volume = data_line.match( numberPattern )[0];
  }else{
    data_line = data_line.replace("ICY Info: StreamTitle=\'","");
    data_line = data_line.replace("\'\;","");
    livedata.nowplaying.title = data_line;
  }
  publisherClient.publish( 'updates', (JSON.stringify(livedata)) );
  //console.log(data_line);
}
//}else if(data_line.indexOf('StreamTitle=')){
//  console.log("stream title\n");
//  console.log(data_line.substring(data_line.lastIndexOf("ICY Info: StreamTitle=")+1,data_line.lastIndexOf("\'\;")));

});
mplayer.stderr.on('data', function (data) { console.log('mplayer stderr: ' + data); });

app.use('/', express.static(__dirname + '/public'));

app.get('/volume/:level', function(req, res){
  var body = JSON.stringify(livedata);
  if(req.params.level == 'up'){
    mplayer.stdin.write('volume +5\n');

  }else if(req.params.level =='down'){
    mplayer.stdin.write('volume -5\n');
  }else{
    console.log(req.params.level);
    mplayer.stdin.write('volume ' + req.params.level + " 1\n"); 
  }
  res.end(body);
});

app.get('/ctrl/:command', function(req, res){
  var body = 'OK';
  if(req.params.command == 'prev'){
    mplayer.stdin.write('pt_step -1\n');
  }else if(req.params.command =='pause'){
    mplayer.stdin.write('pause\n');
  }else if(req.params.command =='next'){
    mplayer.stdin.write('pt_step +1\n');
  }
  res.end(body);
});

app.get('/add/:file', function(req, res){
  var body = 'OK';
  mplayer.stdin.write('loadfile ' + req.params.file + ' 1\n');
  res.end(body);
});



app.get('/update-stream', function(req, res) {
  // let request last as long as possible
  req.socket.setTimeout(Infinity);

  var messageCount = 0;
  var subscriber = redis.createClient();

  subscriber.subscribe("updates");

  // In case we encounter an error...print it out to the console
  subscriber.on("error", function(err) {
    console.log("Redis Error: " + err);
  });

  // When we receive a message from the redis connection
  subscriber.on("message", function(channel, message) {
    messageCount++; // Increment our message count

    res.write('id: ' + messageCount + '\n');
    res.write("data: " + message + '\n\n'); // Note the extra newline
  });

  //send headers for event-stream connection
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write('\n');

  // The 'close' event is fired when a user closes their browser window.
  // In that situation we want to make sure our redis channel subscription
  // is properly shut down to prevent memory leaks...and incorrect subscriber
  // counts to the channel.
  req.on("close", function() {
    subscriber.unsubscribe();
    subscriber.quit();
  });
});

app.get('/fire-event/:event_name', function(req, res) {
  publisherClient.publish( 'updates', ('"' + req.params.event_name + '" page visited') );
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write('All clients have received "' + req.params.event_name + '"');
  res.end();
});


app.listen(3000);
console.log('Listening on port 3000');

var express = require('express');
var sys = require('sys');
var spawn = require('child_process').spawn;
var app = express();
var file = 'http://relay.forever.fm/all.mp3';

mplayer = spawn( 'mplayer', [ '-slave', file ] );
mplayer.on( 'exit', function () { console.log( 'EXIT.' ); } );

// obviously you'll want something smarter than just logging...
mplayer.stdout.on('data', function (data) {
var data_line = ""+data;
if(data_line.indexOf('A: ')){
    console.log("" + data); 
  }
});
mplayer.stderr.on('data', function (data) { console.log('mplayer stderr: ' + data); });

app.use('/', express.static(__dirname + '/public'));

app.get('/volume/:level', function(req, res){
  var body = 'OK';
  if(req.params.level == 'up'){
    mplayer.stdin.write('volume +5\n');

  }else if(req.params.level =='down'){
    mplayer.stdin.write('volume -5\n');
  }else if(req.params.level =='mute'){
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


app.listen(3000);
console.log('Listening on port 3000');

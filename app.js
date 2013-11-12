var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , osc = require('osc-min')
    udp = require('dgram').createSocket('udp4');

var port = 8000;
var bacterias = {};

var OSC_HOST = 'localhost';
var OSC_PORT = 3333;

//setInterval(timeoutBacterias, 1000);

function updateBacteria(key, bacteria, date) {
	bacteria.lastModificationDate = date;
	bacterias[key] = bacteria;

	notifyOSC();
}

function removeBacteria(key) {
	delete bacterias[key];
	notifyOSC();
}

function timeoutBacterias() {
	var currentDate = new Date();
	Object.keys(bacterias).filter(function (v) {		
		console.log(currentDate.getTime() - bacterias[v].lastModificationDate.getTime());
    	return (currentDate.getTime() - bacterias[v].lastModificationDate.getTime() > 3000);
	}).forEach(function (v) {
    	delete bacterias[v];
	});
	notifyOSC();
}

function notifyOSC() {
  var joinedArgs = [];
  Object.keys(bacterias).forEach(function(k) {
  	joinedArgs.push(k);
  	joinedArgs.push(bacterias[k].x);
  	joinedArgs.push(bacterias[k].y);
  });

  console.log("current state: " + joinedArgs);

  var buf;
  buf = osc.toBuffer({
    address: "/bacterias",
    args: joinedArgs
  });
  udp.send(buf, 0, buf.length, OSC_PORT, OSC_HOST);
}

server.listen(port);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});
app.use(express.static('public'));

io.sockets.on('connection', function (socket) {
  socket.on('updateBacteria', function (bacteria) {
    updateBacteria(socket.id, bacteria, new Date());
  });
  socket.on('disconnect', function () { removeBacteria(socket.id); });
});

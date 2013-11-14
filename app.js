var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , osc = require('osc-min')
    udp = require('dgram').createSocket('udp4');

var port = 8000;
var socketIOPort = 8001;
var bacterias = {};

var OSC_HOST = 'localhost';
var OSC_PORT = 3333;

setInterval(timeoutBacterias, 1000);
var idsCounter = 0;

function updateBacteria(key, bacteria, date) {
	bacteria.lastModificationDate = date;
	var t_id;
	if (bacterias[key]) {
		t_id = bacterias[key].t_id;
	} else {
		t_id = idsCounter++;	
	}
	bacteria.t_id = t_id;
	bacterias[key] = bacteria;


	notifyOSC();
}

function removeBacteria(key) {
	delete bacterias[key];
	notifyOSC();
}

function timeoutBacterias() {
	var currentDate = new Date();
	var isModified = false;
	Object.keys(bacterias).filter(function (v) {				
    	return (currentDate.getTime() - bacterias[v].lastModificationDate.getTime() > 3000);
	}).forEach(function (v) {
		isModified = true;
    	delete bacterias[v];
	});
	if (isModified)
		notifyOSC();
}

function notifyOSC() {
  var joinedArgs = [];
  Object.keys(bacterias).forEach(function(k) {
  	joinedArgs.push(bacterias[k].t_id);
  	joinedArgs.push(bacterias[k].x);
  	joinedArgs.push(bacterias[k].y);
  	joinedArgs.push(parseInt(bacterias[k].h));
  	joinedArgs.push(parseFloat(bacterias[k].a));
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
io.set('transports', ['websocket', 'htmlfile', 'xhr-polling', 'jsonp-polling', 'flashsocket']);
// io.enable('browser client minification');  // send minified client
// io.enable('browser client etag');          // apply etag caching logic based on version number
// io.enable('browser client gzip');          // gzip the file


app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});
app.use(express.static('public'));

io.sockets.on('connection', function (socket) {
  socket.on('updateBacteria', function (bacteria) {
    updateBacteria(socket.id, bacteria, new Date());
  });
  socket.on('removeBacteria', function () { removeBacteria(socket.id); });
  socket.on('disconnect', function () { removeBacteria(socket.id); });
});

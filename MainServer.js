var express = require("express");
var globaljs  = require('./ThermServer/routes/global');
var myutils  = require('./ThermServer/routes/myutils');
var tm  = require('./ThermServer/routes/termManagment');

var http = require('http');
var app = express();
var ep_app = require("./ThermServer/ThermServer");
app.use('/therm', ep_app);


var port = process.env.PORT || globaljs.SERVER_PORT;
app.set('port', port);


/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string' ? 'Pipe ' + port  : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}
/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  console.log('Listening on ' + bind);
}
var server = http.createServer(app).listen(app.get('port'));
server.on('error', onError);
server.on('listening', onListening);


var webSocket = require('ws');

var wssThermRest = new webSocket.Server({ server  , path :'/thermRest' ,clientTracking : true });
wssThermRest.on('connection', tm.websocketRestWrapper);




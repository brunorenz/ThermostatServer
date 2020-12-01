var express = require("express");
var path = require("path");
var fs = require("fs");
var bodyParser = require("body-parser");
var morgan = require("morgan");
var errorhandler = require("errorhandler");
var httpSecurityManager = require("../SecurityServer/routes/httpSecurityManager");
var httpProxy = require("./routes/thermHttpProxy");
var termManagment = require("./routes/thermServerHTTP");
var app = express();

function getNextTime() {
  var now = new Date();
  var millis = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 02, 0, 0, 0) - now;
  if (millis < 0) {
    millis += 86400000;
  }
  console.log("Timer expire in " + millis + " msec");
  return millis;
}

var logPath = path.join(__dirname, "../logs");

if (!fs.existsSync(logPath)) {
  fs.mkdirSync(logPath);
}

var accessLogStream = fs.createWriteStream(logPath + "/ThermServer.log", {
  flags: "a",
});
app.use(
  morgan(":date :res[content-length] :remote-addr :method :url - RC: :status :response-time ms", {
    stream: accessLogStream,
  })
);

app.use(httpSecurityManager.checkBasicSecurity);

var jsonParser = bodyParser.json();
var urlencodedParser = bodyParser.urlencoded({ extended: false });

app.disable("x-powered-by");
app.use(express.static(__dirname + "/"));

// development only
if ("development" === app.get("env")) {
  app.use(errorhandler());
}

// DB
console.log("Working directory is " + __dirname);

// nuovi metodi
app.post("/rest/p/*", jsonParser, httpProxy.thermHttpProxy);
app.post("/rest/pu/*", urlencodedParser, httpProxy.thermHttpProxy);
app.get("/rest/g/*", httpProxy.thermHttpProxy);

// Gestione Termostato
// GET METHOD
app.get("/rest/getProgramming", termManagment.getProgramming);
app.get("/rest/getConfiguration", termManagment.getConfiguration);

app.get("/rest/check", termManagment.checkThermostatStatus);

app.get("/rest/getSensorData", termManagment.getSensorData);
app.get("/rest/getReleData", termManagment.getReleData);

app.get("/rest/getReleStatistics", termManagment.getReleStatistics);
app.get("/rest/getSensorStatistics", termManagment.getSensorStatistics);

app.get("/rest/getTemperature", termManagment.updateTemperatureReleStatus);

// POST METHOD
//app.post("/rest/login", urlencodedParser, termManagment.login);

app.post("/rest/shellyRegister", urlencodedParser, termManagment.shellyRegister);

app.post("/rest/updateStatus", urlencodedParser, termManagment.updateStatus);

app.post("/rest/updateConfiguration", urlencodedParser, termManagment.updateConfiguration);
app.post("/rest/addProgramming", urlencodedParser, termManagment.addProgramming);
app.post("/rest/deleteProgramming", urlencodedParser, termManagment.deleteProgramming);

app.post("/rest/updateProgramming", urlencodedParser, termManagment.updateProgramming);

app.post("/rest/monitor", jsonParser, termManagment.monitorSensorData);

module.exports = app;

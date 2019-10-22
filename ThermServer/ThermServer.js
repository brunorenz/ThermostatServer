var express = require("express");
var path = require("path");
var loki = require("lokijs");
var fs = require("fs");
var favicon = require("serve-favicon");
var bodyParser = require("body-parser");
var morgan = require("morgan");
var errorhandler = require("errorhandler");

var globaljs = require("./routes/global");
var termDBFunction = require("./routes/termDB");
var termDBStatFunction = require("./routes/termStatDB");
var termManagment = require("./routes/termManagment");
var app = express();

// all environments
app.use(favicon(path.join(__dirname, "public/images", "favicon.png")));
// HTTP LOGGER

var logPath = path.join(__dirname, "logs");

if (!fs.existsSync(logPath)) {
  fs.mkdirSync(logPath);
}

var accessLogStream = fs.createWriteStream(logPath + "/ThermServer.log", {
  flags: "a"
});
app.use(
  morgan(
    ":date :res[content-length] :remote-addr :method :url - RC: :status :response-time ms",
    { stream: accessLogStream }
  )
);

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

function getNextTime() {
  var now = new Date();
  var millis =
    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 02, 0, 0, 0) -
    now;
  if (millis < 0) {
    millis += 86400000;
  }
  console.log("Timer expire in " + millis + " msec");
  return millis;
}

var cumulateStatistics = function() {
  console.log("Executute cumulateStatistics..");
  termDBStatFunction.cumulateStatistics(globaljs.termStatdb);
  setTimeout(cumulateStatistics, getNextTime());
};

function databaseInitialize() {
  termDBFunction.DBInitialize(termStatdb);
}

var fsadapter = new loki.LokiFsAdapter();
var adapter = new loki.LokiPartitioningAdapter(fsadapter);
var termStatdb = new loki(__dirname + globaljs.DB_NAME, {
  adapter: adapter,
  autoload: true,
  autoloadCallback: databaseInitialize,
  autosave: true,
  autosaveInterval: 2000
});

globaljs.termStatdb = termStatdb;

// Gestione Termostato
// GET METHOD
app.get("/rest/getProgramming", termManagment.getProgramming);
app.get("/rest/addProgramming", termManagment.addProgramming);
app.get("/rest/removeProgramming", termManagment.removeProgramming);
app.get("/rest/getStatistics/:key", termManagment.getStatistics);
app.get("/rest/readDB", termManagment.readDB);
app.get(
  "/rest/checkConfigurationChange/:key",
  termManagment.checkConfigurationChange
);
app.get("/rest/cumulateStatistics", termManagment.cumulateStatistics);
app.get("/rest/getCurrentData", termManagment.getCurrentData);
app.get("/rest/wifiRegisterGet/:key", termManagment.wifiRegisterGet);

// POST METHOD
app.post("/rest/wifiRegister", jsonParser, termManagment.wifiRegister);
app.post("/rest/monitor/:key", jsonParser, termManagment.monitor);
app.post(
  "/rest/updateConfiguration",
  urlencodedParser,
  termManagment.updateConfiguration
);
app.post(
  "/rest/updateTempProgramming",
  urlencodedParser,
  termManagment.updateTempProgramming
);
// Applicazione WEB

// app.use(rewriter);
// app.get('/', rewriter.rewrite('/dashboard'));

app.get("/", function(req, res) {
  var newPath = req.originalUrl;
  if (newPath.slice(-1) == "/") res.redirect(newPath + "dashboard");
  else res.redirect(newPath + "/dashboard");
});

app.get("/dashboard", function(req, res) {
  res.sendFile(__dirname + "/views/dashboard.html");
});
app.get("/statistiche", function(req, res) {
  res.sendFile(__dirname + "/views/statistiche.html");
});
app.get("/configurazione", function(req, res) {
  res.sendFile(__dirname + "/views/configurazione.html");
});
app.get("/programmazioneLight", function(req, res) {
  res.sendFile(__dirname + "/views/programmazioneLight.html");
});
app.get("/programmazioneTemp", function(req, res) {
  res.sendFile(__dirname + "/views/programmazioneTemp.html");
});

/*
 * http.createServer(app).listen(app.get('port'), function(){
 * console.log('Express server listening on port ' + app.get('port')); });
 */

setTimeout(cumulateStatistics, getNextTime());

module.exports = app;

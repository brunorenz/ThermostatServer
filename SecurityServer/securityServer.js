var express = require("express");
var path = require("path");
var fs = require("fs");
var bodyParser = require("body-parser");
var morgan = require("morgan");
var errorhandler = require("errorhandler");
var httpSecurityManager = require("./routes/httpSecurityManager");
var httpManager = require("./routes/securityManager");
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

var accessLogStream = fs.createWriteStream(logPath + "/SecurityServer.log", {
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

app.post("/rest/p/*", jsonParser, httpManager.securityHttpProxy);

module.exports = app;

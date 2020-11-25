var myutils = require("./Common/myutils");
var config = require("./ThermServer/routes/config");
var globaljs = require("./ThermServer/routes/global");
var securityManager = require("./SecurityServer/routes/securityManager");

console.log = (function () {
  var orig = console.log;
  return function () {
    try {
      myutils.log.apply(console, arguments);
    } catch {
      orig.apply(console, arguments);
    }
  };
})();

var express = require("express");

var http = require("http");
var app = express();

var ep_app = require("./ThermServer/thermServer");
app.use("/therm", ep_app);

var ep_app2 = require("./SecurityServer/securityServer");
app.use("/security", ep_app2);

var port = process.env.PORT || globaljs.SERVER_PORT;

app.set("port", port);

/**
 * Start Mongo DB client
 */
var connectOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

/**
 * Start MQTT client
 */
function setupMQTT() {
  var mqtt = require("mqtt");
  var mqManager = require("./ThermServer/routes/thermServerMQ");
  var client = mqtt.connect(globaljs.urlMQTT, {
    will: {
      topic: globaljs.MQTopicLastWill,
      payload: '{ "macAddress" : "server"}',
    },
  });
  client.on("connect", function () {
    console.log("Connected successfully to MQTT server : " + globaljs.urlMQTT);
    globaljs.mqttCli = client;
    mqManager.subscribeTopic(client, globaljs.MQTopicLastWill);
    mqManager.subscribeTopic(client, globaljs.MQTopicWifi);
    mqManager.subscribeTopic(client, globaljs.MQTopicProgramming);
    mqManager.subscribeTopic(client, globaljs.MQTopicShellies);
    mqManager.subscribeTopic(client, globaljs.MQTopicMonitor);
    mqManager.subscribeTopic(client, globaljs.MQTopicMotion);
    mqManager.startMQListening(client);
  });
}

function setupHTTP() {
  /**
   * Event listener for HTTP server "error" event.
   */

  function onError(error) {
    if (error.syscall !== "listen") {
      throw error;
    }

    var bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
      case "EACCES":
        console.error(bind + " requires elevated privileges");
        process.exit(1);
        break;
      case "EADDRINUSE":
        console.error(bind + " is already in use");
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
    var bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
    console.log("Listening on " + bind);
  }
  var server = http.createServer(app).listen(app.get("port"));
  server.on("error", onError);
  server.on("listening", onListening);
}

/**
 * Setup Timers
 */
function setupTimer() {
  var timers = require("./ThermServer/routes/timersManager");
  setTimeout(timers.checkTemperature, 5000);
}

/**
 * Setup initial Task
 */
function setupInitialTask() {
  const thermManager = require("./ThermServer/routes/thermManager");
  let options = {
    action: config.TypeAction.READ,
    createIfNull: true,
    callback: [],
  };
  try {
    // check for TEMP Programing record
    console.log("Check Temperature Programming record ..");
    options.programmingType = config.TypeProgramming.TEMP;
    thermManager.manageProgramming(options);
  } catch (error) {
    console.log(error);
  }
  try {
    // check for LIGHT Programing record
    console.log("Check Light Programming record ..");
    options.programmingType = config.TypeProgramming.LIGHT;
    thermManager.manageProgramming(options);
  } catch (error) {
    console.log(error);
  }
}

/**
 * MAIN
 */

var connectFunc = function (err, db) {
  if (err) {
    console.log("Connected with error to MongoDB server : " + globaljs.urlDB + " : " + err);
    // TODO Cosa fare
  } else {
    console.log("Connected successfully to MongoDB server : " + globaljs.urlDB);
    globaljs.mongoCon = db.db(globaljs.DBName);
    console.log("Created connection for DB  : " + globaljs.mongoCon.databaseName);
    securityManager.initConfigurationServer(db);

    mainTask(globaljs.mongoCon);
  }
};

/**
 * Main
 * @param {*} httpDBMo
 */
function mainTask(httpDBMo) {
  // Setup HTTP
  console.log("Setup HTTP Listener");
  setupHTTP();

  // Setup MQTT
  console.log("Setup MQTT Server");
  setupMQTT();

  // Setup Timer
  console.log("Setup TimeOut service");
  setupTimer();

  //Start initial task
  console.log("Run Initial task");
  setupInitialTask();
}

// Connect to DB
var MongoClient = require("mongodb").MongoClient;
var url = "mongodb://" + globaljs.urlDB;
MongoClient.connect(url, connectOptions, connectFunc);

const thermManager = require("./thermManager");
const shellyMgr = require("./shellyManager");
const mongoUtils = require("../../Common/mongoUtils");
const globaljs = require("./global");
const config = require("./config");

let releTimer = [];

var checkTemperature = function () {
  var options = {
    usePromise: true,
  };
  console.log("Start Timer for CheckTemperature ..");
  new Promise(function (resolve, reject) {
    thermManager.checkThermostatStatus(options, resolve, reject);
  })
    .then(function (options) {
      console.log("Aggiornato stato timer : " + JSON.stringify(options.response));
    })
    .catch(function (error) {
      console.log("Errore in task checkThermostatStatus : " + error);
    });
  setTimeout(checkTemperature, globaljs.MONITOR_TIMEOUT);
};

/**
 *
 * @param {*} options
 */
var manageLightRele = function (options) {
  let shellyCommand = {
    command: config.TypeShellyCommand.COMMAND,
    status: 1,
    deviceid: options.deviceid,
    macAddress: options.macAddress,
    sensorMacAddress: options.sensorMacAddress,
    timeoutRunning: new Date(),
    timeout: 10000,
  };

  // verifica se Timer già impostato
  let entry = null;
  for (let ix = 0; ix < releTimer.length; ix++) {
    if (releTimer[ix].shellyId === shellyCommand.deviceid) {
      entry = releTimer[ix];
      releTimer.splice(ix);
      break;
    }
  }
  if (entry != null) {
    // Timer trovato .. lo resetto
    clearTimeout(entry.timeoutObj);
  }
  if (typeof options.timeoutRunning === "undefined") {
    // prima volta
    callShelly(shellyCommand);
  } else {
    // verifico se lo stato è 0 se si spegni
    let query = {
      collection: globaljs.mongoCon.collection(globaljs.MONGO_MOTIONSTAT),
      selectOne: true,
      sort: { time: -1 },
      filter: {
        macAddress: options.sensorMacAddress,
      },
    };
    options.genericQuery = query;
    options.usePromise = true;
    new Promise(function (resolve, reject) {
      mongoUtils.genericQuery(options, resolve, reject);
    })
      .then(function (options) {
        shellyCommand = options;
        if (options.response && options.response.motion === 0) {
          shellyCommand.status = 0;
          shellyCommand.timeout = 0; // reset timeout
        } else shellyCommand.timeout = 2000;
        callShelly(shellyCommand);
        //resolve(options);
      })
      .catch(function (error) {
        reject(error);
        console.error("**ERROR : " + error);
      });
  }
};

/**
 *
 * @param {*} shellyCommand
 */
let callShelly = function (shellyCommand) {
  console.log("Start Timer for manageLightRele ..");
  shellyMgr.shellySendCommand({ shellyCommand: shellyCommand });
  shellyCommand.timeoutRunning = true;
  if (shellyCommand.timeout > 0) {
    entry = {
      timeoutObj: setTimeout(manageLightRele, shellyCommand.timeout, shellyCommand),
      shellyId: shellyCommand.deviceid,
    };
    releTimer.push(entry);
  }
};
exports.checkTemperature = checkTemperature;
exports.manageLightRele = manageLightRele;

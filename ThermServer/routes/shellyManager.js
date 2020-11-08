const globaljs = require("./global");
const config = require("./config");
const myutils = require("./utils/myutils");
const mongoDBMgr = require("./mongoDBManager");
const http = require("http");

var getIndexProgram = function(progRecord, idProg) {
  if (typeof idProg === "undefined") idProg = progRecord.activeProg;
  let programming = progRecord.programming;
  let index = 0;
  for (let ix = 0; ix < programming.length; ix++) {
    if (programming[ix].idProg === idProg) {
      index = ix;
      break;
    }
  }
  return index;
};

var getStatusByProgram = function(options) {
  let shellyCommand = options.shellyCommand;
  let newStatus = shellyCommand.status;
  if (
    shellyCommand.status === config.TypeStatus.MANUAL ||
    shellyCommand.status === config.TypeStatus.AUTO
  ) {
    let prog = options.response;
    if (prog.idProgType === config.TypeProgramming.TEMP) {
      let themp = shellyCommand.temperature;
      let temperature = 0.0;
      //let currentProg = prog.programming[prog.activeProg];
      let currentProg = prog.programming[getIndexProgram(prog)];
      if (themp.length === 1) temperature = themp[0].currentTemperature;
      else {
        for (let ix = 0; ix < themp.length; ix++) {
          // faccio media di default
          temperature += themp[ix].currentTemperature;
        }
        temperature = temperature / themp.length;
      }
      //console.log("Temperatura calcolata : " + temperature);
      let minTemp = currentProg.minTempManual;
      if (shellyCommand.status === config.TypeStatus.AUTO) {
        console.log("Calcolo fascia ora..");
        let now = new Date();
        let minsec = now.getHours() * 60 + now.getMinutes();
        let day = now.getDay();
        minTemp = currentProg.minTemp;
        console.log("Giorno : " + day + " - Ora " + minsec);
        for (let ix = 0; ix < 7; ix++)
          if (currentProg.dayProgramming[ix].idDay === day)
            for (
              let iy = 0;
              iy < currentProg.dayProgramming[ix].prog.length;
              iy++
            ) {
              let entry = currentProg.dayProgramming[ix].prog[iy];
              if (minsec >= entry.timeStart && minsec <= entry.timeEnd) {
                console.log(
                  "Trovata fascia oraria da " +
                    entry.timeStart +
                    " a " +
                    entry.timeEnd
                );
                minTemp = entry.minTemp;
                break;
              }
            }
      }
      console.log(
        "Temperatura calcolata : " +
          temperature +
          " - Di riferimento " +
          minTemp
      );
      newStatus =
        temperature < minTemp ? config.TypeStatus.ON : config.TypeStatus.OFF;
    } else {
      // programamzione luce
    }
  }
  return newStatus;
};

var shellySendCommandOLD = function(options) {
  //
  //     globaljs.mqttCli.publish(topic, JSON.stringify(msg));
  if (typeof options.shellyCommand !== "undefined") {
    let shellyCommand = options.shellyCommand;
    if (shellyCommand.command === config.TypeShellyCommand.COMMAND) {
      let topic = "shellies/" + shellyCommand.deviceid + "/relay/0/command";
      //
      let newStatus = getStatusByProgram(options);

      let message = newStatus === config.TypeStatus.ON ? "on" : "off";
      console.log("Invio messaggio a " + topic + " => " + message);
      globaljs.mqttCli.publish(topic, message);
    }
  } else console.error("Nessun comando da inviare a dispositivi Shelly!");
};

var shellySendCommand = function(options) {
  //
  //     globaljs.mqttCli.publish(topic, JSON.stringify(msg));
  if (typeof options.shellyCommand !== "undefined") {
    let shellyCommand = options.shellyCommand;
    if (shellyCommand.command === config.TypeShellyCommand.COMMAND) {
      let topic = "shellies/" + shellyCommand.deviceid + "/relay/0/command";
      //
      let newStatus = shellyCommand.status;
      let message = newStatus === config.TypeStatus.ON ? "on" : "off";
      console.log("Invio messaggio a " + topic + " => " + message);
      globaljs.mqttCli.publish(topic, message);
    }
  } else console.error("Nessun comando da inviare a dispositivi Shelly!");
};

exports.shellySendCommand = shellySendCommand;

var callShellySetting = function(options) {
  const httpOptions = {
    hostname: options.ip,
    port: 80,
    path: "/settings",
    method: "GET",
    headers: { Authorization: globaljs.basicAuthShelly }
  };
  var output = "";
  const req = http.request(httpOptions, res => {
    console.log("HTTP response code " + res.statusCode);
    res.on("end", end => {
      let obj = JSON.parse(output);
      console.log(
        "Shelly device found at " + options.ip + " MQTT ID : " + obj.mqtt.id
      );
      var input = config.getConfigurationRecord(options.mac);
      input.deviceType = config.TypeDeviceType.SHELLY;
      input.ipAddress = options.ip;
      input.shellyMqttId = obj.mqtt.id;
      var dbOptions = {
        request: input,
        macAddress: options.mac,
        callback: [],
        register: true,
        update: true,
        createIfNull: true
      };

      mongoDBMgr.readConfiguration(dbOptions);
    });
    res.on("data", data => {
      output += data;
    });
  });
  req.setTimeout(2000, function() {
    console.log(
      ">> TIMEOUT occurred calling " + httpOptions.ip + httpOptions.path
    );
    req.abort();
  });
  req.on("error", error => {
    console.log(
      "Http error calling " + httpOptions.ip + httpOptions.path + " : " + error
    );
  });
  req.end();
};

var updateShellyConfiguration = function(options, rc) {
  console.log("IP : " + options.ip + " - HTTP status code " + rc);
  if (rc === 200) {
    // update mongodb
    console.log(
      "Update shelly configuration for IP/MAC : " +
        options.ip +
        " - " +
        options.mac
    );
    callShellySetting(options);
  } else {
    console.log(
      "IP/MAC : " + options.ip + " - " + options.mac + " is not a shelly device"
    );
  }
};

exports.updateShellyConfiguration = function(options) {
  const httpOptions = {
    hostname: options.ip,
    port: 80,
    path: "/shelly",
    method: "GET"
  };
  const req = http.request(httpOptions, res => {
    updateShellyConfiguration(options, res.statusCode);
  });
  req.setTimeout(2000, function() {
    console.log(
      ">> TIMEOUT occurred calling " + httpOptions.ip + httpOptions.path
    );
    req.abort();
  });
  req.on("error", error => {
    console.log(
      ">> ERROR occurred calling " +
        httpOptions.ip +
        httpOptions.path +
        " : " +
        error
    );
  });
  req.end();
};

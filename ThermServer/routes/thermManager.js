const globaljs = require("./global");
const config = require("./config");
const utils = require("../../Common/myutils");
const mongoDBMgr = require("./mongoDBManager");
const mongoDBStatMgr = require("./mongoDBStatManager");
const shellyMgr = require("./shellyManager");
const netList = require("network-list");
const timerMgr = require("./timersManager");

var callback = function (options, error) {
  if (error) options.error = error;
  let useCallBack = true;
  if (typeof options.usePromise != "undefined") useCallBack = !options.usePromise;
  if (useCallBack) {
    if (options.callback && options.callback.length > 0) {
      if (typeof options.callbackIndex === "undefined") options.callbackIndex = 0;
      if (options.callbackIndex < options.callback.length) {
        options.callback[options.callbackIndex++](options);
      }
    }
  } else {
    if (error) options.reject(error);
    else options.resolve(options);
  }
};

exports.callback = callback;
/**
 * Thermostat programming management
 */
exports.manageProgramming = function (options, resolveIn, rejectIn) {
  switch (options.action) {
    case config.TypeAction.READ:
      mongoDBMgr.readProgramming(options);
      break;
    case config.TypeAction.UPDATE:
      options.response = options.programm;
      mongoDBMgr.updateProgramming(options, resolveIn, rejectIn);
      break;
    case config.TypeAction.ADD:
    case config.TypeAction.DELETE:
      new Promise(function (resolve, reject) {
        mongoDBMgr.readProgramming(options, resolve, reject);
      })
        .then(function (options) {
          if (options.action == config.TypeAction.ADD) mongoDBMgr.addProgramming(options, resolveIn, rejectIn);
          else if (options.action == config.TypeAction.DELETE)
            mongoDBMgr.deleteProgramming(options, resolveIn, rejectIn);
        })
        .catch(function (error) {
          rejectIn(error);
        });
      break;
  }
};

// /**
//  * check and update thermostat configuration
//  */
// exports.monitorInternal = function(options) {
//   mongoDBMgr.monitorSensorData(options);
// };

/**
 * check and update thermostat configuration
 */

/**
 * Update sensor data. Message from ARDUINO
 * @param {*} options
 * @param {*} resolve
 * @param {*} reject
 */
let monitorSensorData = function (options, resolve, reject) {
  let logRecord = options.request;
  // validate data
  if (
    utils.validateNumber(logRecord.temperature) &&
    utils.validateNumber(logRecord.humidity) &&
    utils.validateNumber(logRecord.pressure) &&
    utils.validateNumber(logRecord.light)
  ) {
    var record = {
      temperature: logRecord.temperature,
      humidity: logRecord.humidity,
      pressure: logRecord.pressure,
      statusThermostat: logRecord.statusThermostat,
      numSurveys: logRecord.numSurveys,
      light: logRecord.light,
      macAddress: logRecord.macAddress,
    };
    options.request = record;
    options.deviceType = config.TypeDeviceType.ARDUINO;
    mongoDBMgr.monitorData(options, resolve, reject);
  } else console.log("ERROR : BAD Record " + JSON.stringify(logRecord));
};

/**
 * Update rele data. Message from SHELLY
 * @param {*} options
 * @param {*} resolve
 * @param {*} reject
 */
let monitorReleData = function (options, resolve, reject) {
  let logRecord = options.request.toString();
  var record = {
    shellyId: options.shellyCommand.deviceid,
    status: logRecord === "on" ? 1 : 0,
  };
  options.request = record;
  options.deviceType = config.TypeDeviceType.SHELLY;
  mongoDBMgr.monitorData(options, resolve, reject);
};

/**
 * Update motion data. Message from ARDUINO
 * @param {*} options
 * @param {*} resolve
 * @param {*} reject
 */
let monitorMotionData = function (options, resolve, reject) {
  // let logRecord = options.request;
  // var record = {
  //   status: logRecord.motion,
  //   macAddress: logRecord.macAddress
  // };
  //options.request = record;
  //options.deviceType = config.TypeDeviceType.ARDUINO;
  mongoDBMgr.monitorMotionData(options, resolve, reject);
};

exports.monitorSensorData = monitorSensorData;
exports.monitorReleData = monitorReleData;
exports.monitorMotionData = monitorMotionData;

/**
 * Thermostat register function
 */
exports.readConfigurationInternal = function (options) {
  //
  options.createIfNull = false;
  options.update = false;
  mongoDBMgr.readConfiguration(options);
};

/**
 * Update configuration
 */
exports.updateConfigurationGUI = function (options, resolveIn, rejectIn) {
  mongoDBMgr.updateConfiguration(options, resolveIn, rejectIn);
};

/**
 * Update configuration
 */
exports.updateStatus = function (options, resolveIn, rejectIn) {
  try {
    let json = options.request;
    let req = JSON.parse(json);
    options.updateField = {
      statusThermostat: parseInt(req.statusThermostat),
    };
    options.macAddress = req.macAddress;
  } catch (error) {
    rejectIn(error);
  }
  new Promise(function (resolve, reject) {
    mongoDBMgr.updateConfigurationInternal(options, resolve, reject);
  })
    .then(function (options) {
      resolveIn(options);
    })
    .catch(function (error) {
      rejectIn(error);
    });
};

/**
 * Update configuration
 */
exports.updateConfigurationInternal = function (options) {
  mongoDBMgr.updateConfiguration(options);
};

/**
 * rigister a device
 */
let wifiRegisterInternal = function (options) {
  //
  options.createIfNull = true;
  mongoDBMgr.readConfiguration(options);
};

let arduinoDeviceRegister = function (options, resolveIn, rejectIn) {};

exports.wifiRegisterInternal = wifiRegisterInternal;
// var readProgramming = function(options) {
//   options.createIfNull = true;
//   mongoDBMgr.readProgramming(options);
// };

let shellyRegister = function (options, resolveIn, rejectIn) {
  new Promise(function (resolve, reject) {
    console.log("Find shelly devices ..");
    netList.scan({ vendor: false, timeout: 10 }, (err, arr) => {
      if (err) {
        reject(err);
      } else {
        // array with all devices
        nAlive = 0;
        nShelly = 0;
        newFound = 0;
        for (let i = 0; i < arr.length; i++) {
          let entry = arr[i];
          if (entry.alive) {
            nAlive++;
            var mac = entry.mac != null ? entry.mac.toUpperCase() : "N/A";
            console.log("Chech for IP address " + entry.ip + " with mac address " + mac);
            var outOptions = {
              ip: entry.ip,
              mac: mac,
            };
            shellyMgr.updateShellyConfiguration(outOptions);
            newFound++;
          }
        }
        var out = {
          networkDevices: arr.length,
          networkDevicesAlive: nAlive,
          networkDevicesShelly: nShelly,
          networkDevicesNew: newFound,
        };
        options.response = out;
        resolve(options);
      }
    });
  })
    .then(function (options) {
      resolveIn(options);
    })
    .catch(function (error) {
      rejectIn(error);
    });
};

/**
 * Check if any shelly device is present. If so register it
 */
let shellyRegisterInternal = function (options) {
  console.log("Find shelly devices ..");
  netList.scan({ vendor: false, timeout: 10 }, (err, arr) => {
    if (err) {
      callback(options, err);
    } else {
      // array with all devices
      nAlive = 0;
      nShelly = 0;
      newFound = 0;
      for (let i = 0; i < arr.length; i++) {
        let entry = arr[i];
        if (entry.alive) {
          nAlive++;
          var mac = entry.mac != null ? entry.mac.toUpperCase() : "N/A";
          console.log("Chech for IP address " + entry.ip + " with mac address " + mac);
          var outOptions = {
            ip: entry.ip,
            mac: mac,
          };
          shellyMgr.updateShellyConfiguration(outOptions);
          newFound++;
        }
      }
      var out = {
        networkDevices: arr.length,
        networkDevicesAlive: nAlive,
        networkDevicesShelly: nShelly,
        networkDevicesNew: newFound,
      };
      options.response = out;
      callback(options);
    }
  });
};

exports.shellyRegister = shellyRegister;
/*
let getReleData = function (options, resolveIn, rejectIn) {
  new Promise(function (resolve, reject) {
    let query = {
      collection: globaljs.mongoCon.collection(globaljs.MONGO_CONF),
      filter: {
        $or: [{ flagReleTemp: 1 }, { flagReleLight: 1 }]
      },
      selectOne: false
    };
    options.genericQuery = query;
    mongoDBMgr.genericQuery(options, resolve, reject);
  })
    .then(function (options) {
      if (options.response && options.response.length > 0) {
        query = {
          collection: globaljs.mongoCon.collection(globaljs.MONGO_SHELLYSTAT),
          selectOne: true,
          sort: { time: -1 }
        };
        let pIn = [];
        // recupero stato rele
        for (let ix = 0; ix < options.response.length; ix++)
          pIn.push(
            new Promise(function (resolve, reject) {
              let conf = options.response[ix];
              let nOptions = {
                genericQuery: query,
                usePromise: true,
                shellyId: conf.shellyMqttId,
                macAddress: conf.macAddress,
                location: conf.location,
                flagReleTemp: conf.flagReleTemp,
                flagReleLight: conf.flagReleLight,
                statusThermostat: conf.statusThermostat
              };
              nOptions.genericQuery.filter = {
                shellyId: nOptions.shellyId
              };
              mongoDBMgr.genericQuery(nOptions, resolve, reject);
            })
          );
        if (pIn.length > 0) {
          Promise.all(pIn)
            .then(function (optionsN) {
              options.response = [];
              for (let ix = 0; ix < optionsN.length; ix++) {
                let entry = optionsN[ix];
                let record = entry.response;
                record.location = entry.location;
                record.flagReleTemp = entry.flagReleTemp;
                record.flagReleLight = entry.flagReleLight;
                record.macAddress = entry.macAddress;
                if (record.flagReleTemp === 1)
                  record.statusThermostat = entry.statusThermostat;
                options.response.push(record);
              }
              resolveIn(options);
            })
            .catch(function (error) {
              rejectIn(error);
            });
        }
      } else resolveIn(options);
    })
    .catch(function (error) {
      rejectIn(error);
    });
};
*/

/**
 * Reads Sensors configuration
 *
 * @param {*} options
 * @param {*} resolveIn
 * @param {*} rejectIn
 */
let getSensorData = function (options, resolveIn, rejectIn) {
  new Promise(function (resolve, reject) {
    let query = {
      collection: globaljs.mongoCon.collection(globaljs.MONGO_CONF),
      filter: {
        $or: [{ flagTemperatureSensor: 1 }, { flagLightSensor: 1 }],
      },
      selectOne: false,
    };
    options.genericQuery = query;
    mongoDBMgr.genericQuery(options, resolve, reject);
  })
    .then(function (options) {
      if (options.response) {
        query = {
          collection: globaljs.mongoCon.collection(globaljs.MONGO_SENSORSTAT),
          selectOne: true,
          sort: { time: -1 },
        };
        let optionsN = {
          genericQuery: query,
          usePromise: true,
        };
        let pIn = [];
        for (let ix = 0; ix < options.response.length; ix++)
          pIn.push(
            new Promise(function (resolve, reject) {
              let nOptions = Object.assign({}, optionsN);
              nOptions.macAddress = options.response[ix].macAddress;
              nOptions.location = options.response[ix].location;
              nOptions.genericQuery.filter = {
                macAddress: nOptions.macAddress,
              };
              mongoDBMgr.genericQuery(nOptions, resolve, reject);
            })
          );
        if (pIn.length > 0) {
          Promise.all(pIn)
            .then(function (optionsN) {
              options.response = [];
              for (let ix = 0; ix < optionsN.length; ix++) {
                let record = optionsN[ix].response;
                record.location = optionsN[ix].location;
                options.response.push(record);
              }
              resolveIn(options);
            })
            .catch(function (error) {
              rejectIn(error);
            });
        }
      } else resolveIn(options);
    })
    .catch(function (error) {
      rejectIn(error);
    });
};

exports.getStatistics = function (options, resolveIn, rejectIn) {
  // leggo sensori - rele
  // per ogni esegui map/reduce
  new Promise(function (resolve, reject) {
    let query = {
      collection: globaljs.mongoCon.collection(globaljs.MONGO_CONF),
      filter:
        options.statisticType === "RELE"
          ? {
              $or: [{ flagReleTemp: 1 }, { flagReleLight: 1 }],
            }
          : {
              $or: [{ flagTemperatureSensor: 1 }, { flagLightSensor: 1 }],
            },
      selectOne: false,
    };
    options.genericQuery = query;
    mongoDBMgr.genericQuery(options, resolve, reject);
  })
    .then(function (options) {
      new Promise(function (resolve, reject) {
        options.configuration = options.response;
        //options.depth = 24; //  hour
        //options.interval = 5; //minutes

        options.endTime = new Date().getTime();
        options.startTime = options.endTime - options.depth * 60 * 60 * 1000;
        mongoDBStatMgr.getStatistics(options, resolve, reject);
      })
        .then(function (options) {
          resolveIn(options);
        })
        .catch(function (error) {
          rejectIn(error);
        });
    })
    .catch(function (error) {
      rejectIn(error);
    });
};

/**
 * Reads the configuration of the Light-type Relays assigned to a specific sensor
 * @param {*} options
 */
let readReleMotionLight = function (options) {
  return new Promise(function (resolve, reject) {
    let query = {
      collection: globaljs.mongoCon.collection(globaljs.MONGO_CONF),
      filter: {
        $and: [{ primarySensor: options.request.macAddress }, { flagReleLight: 1 }],
      },
      selectOne: false,
    };
    options.genericQuery = query;
    mongoDBMgr.genericQuery(options, resolve, reject);
  });
};

/**
 * Reads the configuration of the thermostat type relays
 * @param {*} options
 */
let readReleTemperature = function (options) {
  return new Promise(function (resolve, reject) {
    let query = {
      collection: globaljs.mongoCon.collection(globaljs.MONGO_CONF),
      filter: { flagReleTemp: 1 },
      selectOne: true,
    };
    options.genericQuery = query;
    mongoDBMgr.genericQuery(options, resolve, reject);
  });
};

/**
 * Reads the temperature sensor configuration
 * @param {*} options
 */
let readSensor = function (options) {
  return new Promise(function (resolve, reject) {
    let query = {
      collection: globaljs.mongoCon.collection(globaljs.MONGO_CONF),
      filter: options.filterSensor, //{ flagTemperatureSensor: 1 },
      selectOne: false,
    };
    options.genericQuery = query;
    mongoDBMgr.genericQuery(options, resolve, reject);
  });
};

/**
 * Reads programming data of a specific type
 * @param {*} options
 */
let readProgramming = function (options) {
  return new Promise(function (resolve, reject) {
    let query = {
      collection: globaljs.mongoCon.collection(globaljs.MONGO_PROG),
      filter: { _id: options.programmingType },
      selectOne: true,
    };
    options.genericQuery = query;
    mongoDBMgr.genericQuery(options, resolve, reject);
  });
};

/**
 * Calculate the temperature by reading the data from the sensors and the programming data
 *
 * @param {*} options
 * @param {*} resolveIn
 * @param {*} rejectIn
 */
let computeTemperatureReleStatus = function (options, resolveIn, rejectIn) {
  // find the temperature rele
  // mi arriva
  let r1 = readReleTemperature(options);
  r1.then(function (options) {
    let conf = options.response;
    options.releConf = conf;
    options.filterSensor = { flagTemperatureSensor: 1 };
    // find all temperature sensore
    let r2 = readSensor(options);
    r2.then(function (options) {
      // compute temperature according to rele configuration
      options.tempSensor = options.response;
      // read actual programming
      options.programmingType = config.TypeProgramming.TEMP;
      let r3 = readProgramming(options);
      r3.then(function (options) {
        evaluateTemperature(options, resolveIn, rejectIn);
        //resolveIn(options);
      }).catch(function (error) {
        rejectIn(error);
      });
    }).catch(function (error) {
      rejectIn(error);
    });
  }).catch(function (error) {
    rejectIn(error);
  });
};

/**
 * Calculate light by reading the data from the sensors and the programming data
 *
 * @param {*} options
 * @param {*} resolveIn
 * @param {*} rejectIn
 */
let computeLightReleStatus = function (options, resolveIn, rejectIn) {
  options.releConf = options.conf;
  options.filterSensor = { macAddress: options.conf.primarySensor };
  //$and: [{ macAddress: options.conf.primarySensor }, { flagReleLight: 1 }]
  // find all temperature sensore
  let r2 = readSensor(options);
  r2.then(function (options) {
    // compute temperature according to rele configuration
    options.lightSensor = options.response;
    // read actual programming
    options.programmingType = config.TypeProgramming.LIGHT;
    let r3 = readProgramming(options);
    r3.then(function (options) {
      evaluateLight(options, resolveIn, rejectIn);
    }).catch(function (error) {
      rejectIn(error);
    });
  }).catch(function (error) {
    rejectIn(error);
  });
};

let checkThermostatStatus = function (options, resolveIn, rejectIn) {
  new Promise(function (resolve, reject) {
    computeTemperatureReleStatus(options, resolve, reject);
  })
    .then(function (options) {
      let status = config.TypeStatus.OFF;
      switch (options.releConf.statusThermostat) {
        case config.TypeStatus.ON:
          status = config.TypeStatus.ON;
          break;
        case config.TypeStatus.AUTO:
          if (options.response.temperature < options.response.minTempAuto) status = config.TypeStatus.ON;
          break;
        case config.TypeStatus.MANUAL:
          if (options.response.temperature < options.response.minTempManual) status = config.TypeStatus.ON;
          break;
      }
      options.shellyCommand = {
        command: config.TypeShellyCommand.COMMAND,
        status: status,
        deviceid: options.releConf.shellyMqttId,
      };
      shellyMgr.shellySendCommand(options);
      options.response.deviceid = options.releConf.shellyMqttId;
      options.response.status = status;
      if (resolveIn != "undefined") resolveIn(options);
    })
    .catch(function (error) {
      if (rejectIn != "undefined") rejectIn(error);
      else console.error("**ERROR : " + error);
    });
};

/**
 *
 * @param {*} options {macAddreess, motion}
 * @param {*} resolveIn
 * @param {*} rejectIn
 */
let updateMotionReleStatus = function (options, resolveIn, rejectIn) {
  let r1 = readReleMotionLight(options);
  r1.then(function (options) {
    new Promise(function (resolve, reject) {
      if (options.response.length == 0) resolveIn(oprions);
      else {
        options.conf = options.response[0];
        computeLightReleStatus(options, resolve, reject);
      }
    })
      .then(function (options) {
        console.log("Light : " + JSON.stringify(options.response));
        //TODO per ora gestisco un solo rele
        let l = options.response;
        if (l.currentLight < l.minLightAuto) {
          console.log("Accendo rele " + options.response.primarySensor);
          let shellyCommand = {
            deviceid: options.conf.shellyMqttId,
            macAddress: options.conf.macAddress,
            sensorMacAddress: options.conf.primarySensor,
          };
          timerMgr.manageLightRele(shellyCommand);
        }
        resolveIn(options);
      })
      .catch(function (error) {
        rejectIn(error);
      });
  }).catch(function (error) {
    rejectIn(error);
  });
};
/**
 *
 * @param {*} options {macAddreess, motion}
 * @param {*} resolveIn
 * @param {*} rejectIn
 */
let updateMotionReleStatus2 = function (options, resolveIn, rejectIn) {
  // find the temperature rele
  let r1 = readReleMotionLight(options);
  r1.then(function (options) {
    let conf = options.response;
    options.releConf = conf;
    if (conf.length > 0) {
      options.programmingType = config.TypeProgramming.LIGHT;
      let r3 = readProgramming(options);
      r3.then(function (options) {
        // per ogni rele trovato gestisci stato
        options.programming = options.response;
        new Promise(function (resolve, reject) {
          evaluateLight(options, resolveIn, rejectIn);
        })
          .then(function (options) {
            for (let ix = 0; ix < conf.length; ix++) {
              // call shelly
              let shellyCommand = {
                deviceid: conf[ix].shellyMqttId,
                macAddress: conf[ix].macAddress,
              };
              timerMgr.manageLightRele(shellyCommand);
            }
            resolveIn(options);
          })
          .catch(function (error) {
            rejectIn(error);
          });
      }).catch(function (error) {
        rejectIn(error);
      });
    } else resolveIn(options);
  }).catch(function (error) {
    rejectIn(error);
  });
};
/**
 *
 * @param {*} options {macAddress,motion}
 * @param {*} resolveIn
 * @param {*} rejectIn
 */
let processMotion = function (options, resolveIn, rejectIn) {
  if (options.request.motion === 1) {
    new Promise(function (resolve, reject) {
      updateMotionReleStatus(options, resolve, reject);
    })
      .then(function (options) {
        mongoDBMgr.monitorMotionData(options, resolveIn, rejectIn);
      })
      .catch(function (error) {
        rejectIn(error);
      });
  } else {
    mongoDBMgr.monitorMotionData(options, resolveIn, rejectIn);
  }
};

exports.processMotion = processMotion;
/**
 * get index of current program
 * @param {*} progRecord
 * @param {*} idProg
 */
var getIndexProgram = function (progRecord, idProg) {
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

/**
 *
 * @param {*} options
 * @param {*} resolveIn
 * @param {*} rejectIn
 */
let evaluateLight = function (options, resolveIn, rejectIn) {
  let sensor = options.lightSensor;
  let prog = options.response;
  let currentProg = prog.programming[getIndexProgram(prog)];
  console.log("Current program : " + currentProg.name);
  // un solo sensore possibile per la luce
  options.response = {
    currentLight: 0,
    minLightAuto: currentProg.minLight,
  };
  if (sensor.length > 0) {
    console.log("Location " + sensor[0].location + " - Luce " + sensor[0].currentLight);
    if (
      typeof options.request != "undefined" &&
      typeof options.request.macAddress != "undefined" &&
      options.request.macAddress === sensor[0].macAddress &&
      typeof options.request.light != "undefined"
    )
      options.response.currentLight = options.request.light;
    else options.response.currentLight = sensor[0].currentLight;
    options.response.primarySensor = sensor[0].location;
  }

  let autoRecord = recuperaFasciaOraria(currentProg);
  if (autoRecord != null) options.response.minLightAuto = autoRecord.minLight;
  resolveIn(options);
};

/**
 * evalute temperature according programming
 * @param {*} options
 * @param {*} resolveIn
 * @param {*} rejectIn
 */
let evaluateTemperature = function (options, resolveIn, rejectIn) {
  let temperature = 0;
  let conf = options.releConf;
  let sensor = options.tempSensor;
  let prog = options.response;
  let currentProg = prog.programming[getIndexProgram(prog)];
  console.log("Current program : " + currentProg.name);
  let primarySensor = conf.primarySensor;
  if (sensor && sensor.length > 0) {
    console.log("trovati " + sensor.length + " sensori che misurano temperatura");
    for (let ix = 0; ix < sensor.length; ix++) {
      if (primarySensor === sensor[ix].macAddress) primarySensor = sensor[ix].location;
      console.log("Location " + sensor[ix].location + " - Temperatura " + sensor[ix].currentTemperature);
      console.log("Location " + sensor[ix].location + " - Luce " + sensor[ix].currentLight);
    }
  }
  // get current program
  let minTempManual = currentProg.minTempManual;
  let minTempAuto = currentProg.minTemp;
  let autoRecord = recuperaFasciaOraria(currentProg);
  // console.log("Calcolo fascia ora..");
  // let now = new Date();
  // let minsec = now.getHours() * 60 + now.getMinutes();
  // let day = now.getDay();
  // minTempAuto = currentProg.minTemp;
  // // day su db 0 Lun - 7 Dom
  // let dayDb = day - 1;
  // if (dayDb < 0) dayDb = 6;
  // console.log("Giorno : " + day + " (dayDB) " + dayDb + " - Ora " + minsec);
  // for (let ix = 0; ix < 7; ix++)
  //   if (currentProg.dayProgramming[ix].idDay === dayDb)
  //     for (let iy = 0; iy < currentProg.dayProgramming[ix].prog.length; iy++) {
  //       let entry = currentProg.dayProgramming[ix].prog[iy];
  //       if (minsec >= entry.timeStart && minsec <= entry.timeEnd) {
  //         autoRecord = entry;
  //         break;
  //       }
  //     }
  let prioritySensor = null;
  if (autoRecord != null) {
    console.log("Trovata fascia oraria da " + autoRecord.timeStart + " a " + autoRecord.timeEnd);
    minTempAuto = autoRecord.minTemp;
    prioritySensor = autoRecord.priorityDisp;
  }

  if (sensor.length === 1) temperature = sensor[0].currentTemperature;
  else {
    switch (conf.temperatureMeasure) {
      case config.TypeMeasure.LOCAL:
        temperature = getTemperature(sensor, conf.primarySensor);
        break;
      case config.TypeMeasure.MEDIUM:
        temperature = getTemperature(sensor);
        break;
      case config.TypeMeasure.PRIORITY:
        temperature = getTemperature(sensor, autoRecord != null ? autoRecord.priorityDisp : "");
        break;
    }
  }
  options.response = {
    temperature: temperature,
    temperatureMeasure: conf.temperatureMeasure,
    //primarySensor: primarySensor,
    minTempManual: minTempManual,
    minTempAuto: minTempAuto,
  };
  if (prioritySensor != null && prioritySensor != "") options.response.prioritySensor = prioritySensor;
  resolveIn(options);
};

let recuperaFasciaOraria = function (currentProg) {
  let autoRecord = null;
  console.log("Calcolo fascia ora..");
  let now = new Date();
  let minsec = now.getHours() * 60 + now.getMinutes();
  let day = now.getDay();
  //minTempAuto = currentProg.minTemp;
  // day su db 0 Lun - 7 Dom
  let dayDb = day - 1;
  if (dayDb < 0) dayDb = 6;
  console.log("Giorno : " + day + " (dayDB) " + dayDb + " - Ora " + minsec);
  for (let ix = 0; ix < 7; ix++)
    if (currentProg.dayProgramming[ix].idDay === dayDb)
      for (let iy = 0; iy < currentProg.dayProgramming[ix].prog.length; iy++) {
        let entry = currentProg.dayProgramming[ix].prog[iy];
        if (minsec >= entry.timeStart && minsec <= entry.timeEnd) {
          autoRecord = entry;
          break;
        }
      }
  return autoRecord;
};

let getTemperature = function (sensor, macAddress) {
  let temperature = null;
  if (typeof macAddress != "undefined") {
    for (let ix = 0; ix < sensor.length; ix++)
      if (sensor[ix].macAddress === macAddress) {
        temperature = sensor[ix].currentTemperature;
        break;
      }
  }
  if (temperature === null) {
    // calcolo media
    temperature = 0;
    for (let ix = 0; ix < sensor.length; ix++) {
      temperature += sensor[ix].currentTemperature;
    }
    temperature = temperature / sensor.length;
  }
  return temperature;
};

let readMonitor = function (options) {
  options.genericQuery = {
    collection: globaljs.mongoCon.collection(globaljs.MONGO_SHELLYSTAT),
    selectOne: true,
    filter: { shellyId: options.conf.shellyMqttId },
    sort: { time: -1 },
  };
  return new Promise(function (resolveIn, rejectIn) {
    new Promise(function (resolve, reject) {
      mongoDBMgr.genericQuery(options, resolve, reject);
    })
      .then(function (options) {
        options.shellyData = options.response;
        if (options.conf.flagReleTemp === 1) {
          computeTemperatureReleStatus(options, resolveIn, rejectIn);
        } else if (options.conf.flagReleLight === 1) {
          computeLightReleStatus(options, resolveIn, rejectIn);
        } else resolveIn(options);
      })
      .catch(function (error) {
        rejectIn(error);
      });
  });
};

/**
 * Read Rele configuration
 * @param {*} options
 * @param {*} resolveIn
 * @param {*} rejectIn
 */
let getReleData2 = function (options, resolveIn, rejectIn) {
  new Promise(function (resolve, reject) {
    let query = {
      collection: globaljs.mongoCon.collection(globaljs.MONGO_CONF),
      filter: {
        $or: [{ flagReleTemp: 1 }, { flagReleLight: 1 }],
      },
      selectOne: false,
    };
    options.genericQuery = query;
    mongoDBMgr.genericQuery(options, resolve, reject);
  })
    .then(function (options) {
      if (options.response && options.response.length > 0) {
        let pIn = [];
        // recupero stato rele
        for (let ix = 0; ix < options.response.length; ix++) {
          let optionsN = {
            usePromise: true,
            confRele: options.response,
            conf: options.response[ix],
          };
          pIn.push(readMonitor(optionsN));
        }
        if (pIn.length > 0) {
          Promise.all(pIn)
            .then(function (optionsN) {
              options.response = [];
              for (let ix = 0; ix < optionsN.length; ix++) {
                let entry = {
                  configuration: optionsN[ix].conf,
                  shelly: optionsN[ix].shellyData,
                };
                if (optionsN[ix].conf.flagReleTemp === 1) {
                  entry.temperature = optionsN[ix].response;
                } else if (optionsN[ix].conf.flagReleLight === 1) {
                  entry.light = optionsN[ix].response;
                }
                options.response.push(entry);
              }

              resolveIn(options);
            })
            .catch(function (error) {
              rejectIn(error);
            });
        }
      } else resolveIn(options);
    })
    .catch(function (error) {
      rejectIn(error);
    });
};
/**
 * Exported function
 */
exports.getReleData = getReleData2;
exports.getSensorData = getSensorData;
exports.checkThermostatStatus = checkThermostatStatus;
exports.updateTemperatureReleStatus = computeTemperatureReleStatus;

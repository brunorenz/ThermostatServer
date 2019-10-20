var globaljs = require("./global");
var termDBFunction = require("./termDB");
var termDBStatFunction = require("./termStatDB");
var http = require("http");
var myutils = require("./myutils");
var webSocket = require("ws");

/**
 * Get configuration record by key
 */
var readConfByKey = function(key, update) {
  var idLoki = parseInt(key);
  var conf = termDBFunction.readConfigurationByKey(
    globaljs.termStatdb,
    idLoki,
    update
  );
  return conf;
};

/**
 * Update DB with monitor data
 */
var processMonitorData = function(logRecord, conf) {
  termDBFunction.updateTermLog(globaljs.termStatdb, conf, logRecord);
};

/**
 * Update DB with monitor data
 */
var monitorResp = function(logRecord, conf) {
  termDBFunction.updateTermLog(globaljs.termStatdb, conf, logRecord);
};
/**
 * Manage callback monitor function
 */
var startMonitoring = function(conf) {
  console.log("Monitoring Terminal .." + conf.$loki);

  var options = {
    hostname: conf.callbackUrl,
    port: conf.callbackPort
  };
  options.path = "/termCli/monitor";
  myutils.httpGetJSON(options, monitorResp, conf);

  setTimeout(startMonitoring, globaljs.MONITOR_TIMEOUT, conf);
};
/**
 * Create generic response
 */
function createResponse(object, errorCode, message) {
  if (!errorCode) {
    errorCode = 0;
    message = "OK";
  }
  var error = {
    code: errorCode,
    message: message
  };
  var response = {
    error: error
  };
  if (object !== null) {
    response.data = object;
  }
  return response;
}

/**
 * Return just current programming if any (type temperature)
 */
function getCurrentProgrammingTemp(conf) {
  var cconf = {};
  if (conf.activeProg >= 0) {
    cconf.currentProgram = conf.programming[conf.activeProg];
  }
  cconf.minTemp = conf.minTemp;
  cconf.minTempManual = conf.minTempManual;
  cconf.manualMode = conf.manualMode;
  cconf.active = conf.active;
  cconf.activeProg = conf.activeProg;
  cconf.$loki = conf.$loki;
  return cconf;
}

/**
 * Return just current programming if any (type light)
 */
function getCurrentProgrammingLight(conf) {
  var cconf = {};
  if (conf.activeProg >= 0) {
    cconf.currentProgram = conf.programming[conf.activeProg];
  }
  cconf.minLight = conf.minLight;
  cconf.$loki = conf.$loki;
  return cconf;
}

function getProgrammingInfo(idDispType, all) {
  console.log("Get Programming info for type : " + idDispType);
  var out = {};
  var prog = termDBFunction.readProgramming(
    globaljs.termStatdb,
    idDispType,
    true
  );
  if (prog) {
    // prog.currentTime = Date.now();
    if (all === true) {
      out = prog;
    } else {
      if (idDispType === globaljs.PROG_TEMP)
        out = getCurrentProgrammingTemp(prog);
      else out = getCurrentProgrammingLight(prog);
    }
  } else {
    out = null;
  }
  return out;
}

/**
 * Check basic authentication from http header
 */
function checkSecurity(req, res) {
  var rc = true;
  if (globaljs.BASIC_AUTH_REQUIRED) {
    if (!req.headers.authorization) {
      res.send(400, "missing authorization header");
      rc = false;
    } else if (req.headers.authorization !== globaljs.BASIC_AUTH) {
      res.send(401);
      rc = false;
    }
  }
  return rc;
}

/**
 * Check if a massive DB update is running
 */
function checkDBUpdate() {
  var rc = true;

  return rc;
}

function updateConfigurationFromRequest(par, conf) {
  if (par && conf) {
    if (par.flagLcd) conf.flagLcd = parseInt(par.flagLcd);
    if (par.flagLightSensor)
      conf.flagLightSensor = parseInt(par.flagLightSensor);
    if (par.flagMotionSensor)
      conf.flagMotionSensor = parseInt(par.flagMotionSensor);
    if (par.flagReleTemp) conf.flagReleTemp = parseInt(par.flagReleTemp);
    if (par.flagReleLight) conf.flagReleLight = parseInt(par.flagReleLight);
    if (par.ipAddress) conf.ipAddress = par.ipAddress;
  }
  return conf;
}

/**
 * Update the lastUpdate attribute for all configured devices
 *
 * @param tms
 * @returns
 */
function updateConfigurationTimeStamp(tms) {
  var confColl = globaljs.termStatdb.getCollection(globaljs.CONF);
  var l = confColl.chain().data();
  if (l) {
    for (var i = 0; i < l.length; i++) {
      console.log("Update Configuration for ");
      var rec = l[i];
      // if (rec.flagTemperatureSensor)
      rec.lastUpdate = tms;
      confColl.update(rec);
    }
  }
}

/**
 * Update programming configuration
 */
var updateTempProgramming = function(req, res) {
  if (!checkSecurity(req, res)) return;
  var p = req.body;
  if (p.dati) {
    var t = p.dati;
    console.log("DATI : " + t);
    var progData = JSON.parse(t);
    // leggo prog data
    var confColl = globaljs.termStatdb.getCollection(globaljs.PROG);
    var progOut = confColl.findOne({
      idProgType: globaljs.PROG_TEMP
    });
    if (progOut) {
      // aggiorno
      var meta = progOut.meta;
      var key = progOut.$loki;
      // out = progData;
      progData.$loki = key;
      progData.meta = meta;
      progData.lastUpdate = Date.now();
      confColl.update(progData);
      // aggiorno riferimenti a Dispositivi
      updateConfigurationTimeStamp(progData.lastUpdate);
      termDBFunction.saveDatabase(
        globaljs.termStatdb,
        "Save Database after updateTempProgramming completed"
      );
      myutils.webSocketSendEvent("update");
    }
  }
  res.redirect("back");
};

var updateConfiguration = function(req, res) {
  if (!checkSecurity(req, res)) return;
  var p = req.body;

  var conf = readConfByKey(p.key);
  if (conf) {
    if (p.location) conf.location = p.location;
    if (p.statusLight) conf.statusLight = parseInt(p.statusLight);
    if (p.status) conf.status = parseInt(p.status);
    if (p.tempMeasure && conf.flagReleTemp === 1) {
      conf.tempMeasure = parseInt(p.tempMeasure);
    }
    conf = updateConfigurationFromRequest(p, conf);
    conf.lastUpdate = Date.now();
    termDBFunction.updateConfiguration(globaljs.termStatdb, conf);
    termDBFunction.saveDatabase(
      globaljs.termStatdb,
      "Save Database after updateConfiguration completed"
    );
    myutils.webSocketSendEvent("update");
    // notifyConfigurationChange();
  }
  res.redirect("back");
};

/**
 * Monitor temperature info
 */
var monitor = function(req, res) {
  // console.log("Monitor REQ body : " + JSON.stringify(req.body))
  // console.log("Monitor REQ params : " + JSON.stringify(req.params))
  if (!checkSecurity(req, res)) return;
  var conf = readConfByKey(req.params.key);
  if (!conf) {
    res.json(createResponse(null, 100, "Configuration not Found"));
  } else {
    termDBFunction.updateTermLog(globaljs.termStatdb, conf, req.body);
    res.json(createResponse(null));
  }
};

/**
 * Generic read DB collections
 */
var readDB = function(req, res) {
  if (!checkSecurity(req, res)) return;
  var p = myutils.httpGetParam(req);
  var options = {
    collection: globaljs.CONF,
    key: 0,
    maxRecords: 100,
    sort: "a"
  };
  if (p) {
    if (p.sort && p.sort === "d") {
      options.sort = "d";
    }
    if (p.coll) {
      if (p.coll === "log") options.collection = globaljs.LOG;
      else if (p.coll === "prog") options.collection = globaljs.PROG;
      else if (p.coll === "stat") options.collection = globaljs.STAT;
    }
    if (p.key) options.key = parseInt(p.key);
    if (p.maxRecords) options.maxRecords = parseInt(p.maxRecords);
  }
  var rs = termDBFunction.readCollection(globaljs.termStatdb, options);
  if (rs) {
    res.json(createResponse(rs));
  } else {
    res.json(createResponse(null, 100, "Collection not Found"));
  }
};

/**
 * Delete a programming entry
 */
var removeProgramming = function(req, res) {
  if (!checkSecurity(req, res)) return;

  var type = -1;
  var id = -1;
  var p = myutils.httpGetParam(req);
  if (p) {
    if (p.type) {
      if (p.type === "temp") type = globaljs.PROG_TEMP;
      else if (p.type === "light") type = globaljs.PROG_LIGHT;
    }
    if (p.id) {
      id = parseInt(p.id);
    }
  }
  if (id === -1) {
    res.json(createResponse(null, 999, "Nessuna programmazione eliminata"));
  } else {
    var prog = termDBFunction.deleteProgramming(globaljs.termStatdb, type, id);
    if (prog) {
      updateConfigurationTimeStamp(prog.lastUpdate);
      termDBFunction.saveDatabase(
        globaljs.termStatdb,
        "Save Database after deleteProgramming completed"
      );
      res.json(createResponse(prog));
    } else
      res.json(createResponse(null, 999, "Nessuna programmazione eliminata"));
  }
};

/**
 * Add a new programming entry
 */
var addProgramming = function(req, res) {
  if (!checkSecurity(req, res)) return;

  var type = -1;
  var p = myutils.httpGetParam(req);
  if (p) {
    if (p.type) {
      if (p.type === "temp") type = globaljs.PROG_TEMP;
      else if (p.type === "light") type = globaljs.PROG_LIGHT;
    }
  }
  var prog = termDBFunction.addProgramming(globaljs.termStatdb, type);
  if (prog) {
    updateConfigurationTimeStamp(prog.lastUpdate);
    termDBFunction.saveDatabase(
      globaljs.termStatdb,
      "Save Database after addProgramming completed"
    );
    res.json(createResponse(prog));
  } else res.json(createResponse(null, 999, "Nessuna programmazione aggiunta"));
};

/**
 * Get programming info type = temp/light prog = all / reset
 */
var getProgramming = function(req, res) {
  if (!checkSecurity(req, res)) return;

  var all = false;
  var reset = false;
  var type = globaljs.PROG_TEMP;
  var p = myutils.httpGetParam(req);
  if (p) {
    if (p.type) {
      if (p.type === "temp") type = globaljs.PROG_TEMP;
      else if (p.type === "light") type = globaljs.PROG_LIGHT;
    }
    if (p.prog) {
      all = p.prog === "all";
      reset = p.prog === "reset";
    }
  }
  if (reset) {
    var prog = termDBFunction.resetProgramming(globaljs.termStatdb, type);
    updateConfigurationTimeStamp(prog.lastUpdate);
    termDBFunction.saveDatabase(
      globaljs.termStatdb,
      "Save Database after resetProgramming completed"
    );
    res.json(createResponse(prog));
  } else {
    var out = getProgrammingInfo(type, all);
    if (out === null) {
      res.json(createResponse(null, 100, "Programming not Found"));
    } else {
      res.json(createResponse(out));
    }
  }
};

/**
 * Get statistic info
 */
var getStatistics = function(req, res) {
  if (!checkSecurity(req, res)) return;

  var conf = readConfByKey(req.params.key);
  if (!conf) {
    res.json(createResponse(null, 100, "Configuration not Found"));
  } else {
    var p = myutils.httpGetParam(req);
    if (conf) {
      var param = {
        type: "day",
        interval: 5
      };
      if (p.type) param.type = p.type.toLowerCase();
      if (p.interval) param.interval = parseInt(p.interval);
      res.json(
        createResponse(
          termDBStatFunction.getStatistics(globaljs.termStatdb, conf, param)
        )
      );
    } else {
      res.json(createResponse(null, 100, "Not Found"));
    }
  }
};

/**
 * Check for configuration changes
 */
var checkConfigurationChange = function(req, res) {
  if (!checkSecurity(req, res)) return;
  // Key is IdDisp
  var conf = readConfByKey(req.params.key, true);
  if (conf) {
    var needUpdate = 0;
    var p = myutils.httpGetParam(req);
    if (p && p.lastUpdate) {
      needUpdate = conf.lastUpdate - Number(p.lastUpdate) > 1000 ? 1 : 0;
    } else {
      needUpdate = 1;
      // return whole configuration
    }
    var change = {
      needUpdate: needUpdate
    };
    if (needUpdate === 1) {
      var configuration = {
        status: conf.status,
        lastUpdate: conf.lastUpdate,
        tempMeasure: conf.tempMeasure
      };
      change.configuration = configuration;
      // TEMP
      var t = getProgrammingInfo(globaljs.PROG_TEMP, false);
      if (t) {
        configuration.minTemp = t.minTemp;
        configuration.minTempManual = t.minTempManual;
        change.currentTempProgram = t.currentProgram;
      }
      // LIGHT
      var l = getProgrammingInfo(globaljs.PROG_LIGHT, false);
      if (l) {
        change.currentLightProgram = l.currentProgram;
      }
    }
    res.json(createResponse(change));
  } else {
    res.json(createResponse(null, 100, "Configuration not Found"));
  }
};

/**
 * Read last temperature measurement for all devices available
 */
var getCurrentData = function(req, res) {
  if (!checkSecurity(req, res)) return;
  var options = {
    collection: globaljs.CONF
  };
  var rs = termDBFunction.readCollection(globaljs.termStatdb, options);
  var json = {};
  var out = [];
  if (rs) {
    var logColl = globaljs.termStatdb.getCollection(globaljs.LOG);
    for (var i = 0; i < rs.length; i++) {
      var conf = rs[i];
      var d = {
        idDisp: conf.$loki,
        location: conf.location,
        temperature: 0,
        pressure: 0,
        humidity: 0,
        light: 0,
        flagReleTemp: conf.flagReleTemp
      };
      if (d.flagReleTemp === 1) {
        json.tempMeasure = conf.tempMeasure;
        if (!json.tempMeasure) json.tempMeasure = globaljs.TEMP_LOCAL;
      }
      var lastLog = logColl
        .chain()
        .find({
          idDisp: d.idDisp
        })
        .simplesort("tmsUpd", true)
        .limit(1)
        .data();
      if (lastLog && lastLog.length > 0) {
        d.temperature = lastLog[0].temperature;
        d.pressure = lastLog[0].pressure;
        d.humidity = lastLog[0].humidity;
        if (conf.flagLightSensor === 1) d.light = lastLog[0].light;
        d.tmsUpd = lastLog[0].tmsUpd;
        if (conf.flagReleTemp === 1) json.status = lastLog[0].status;
      }
      out.push(d);
    }
    json.temp = out;
    json.now = new Date().getTime();
    res.json(createResponse(json));
  } else {
    res.json(createResponse(null, 100, "Configuration not Found"));
  }
};

/**
 * Register a wifi client by using its mac address
 */
var wifiRegisterGet = function(req, res) {
  if (!checkSecurity(req, res)) return;
  var conf = termDBFunction.readConfiguration(
    globaljs.termStatdb,
    req.params.key
  );
  if (!conf) {
    // create configuration record
    conf = termDBFunction.readConfiguration(
      globaljs.termStatdb,
      req.params.key,
      true
    );
    conf.lastUpdate = Date.now();
    // create programming default record if nont present
    termDBFunction.readProgramming(
      globaljs.termStatdb,
      globaljs.PROG_TEMP,
      true
    );
    termDBFunction.readProgramming(
      globaljs.termStatdb,
      globaljs.PROG_LIGHT,
      true
    );
  }
  if (conf) {
    // update last access
    conf.lastAccess = Date.now();
    var p = myutils.httpGetParam(req);
    conf = updateConfigurationFromRequest(p, conf);
    termDBFunction.updateConfiguration(globaljs.termStatdb, conf);
    termDBFunction.saveDatabase(
      globaljs.termStatdb,
      "Save Database after wifiRegister completed"
    );
    var d = new Date();
    conf.timeZoneOffset = d.getTimezoneOffset();
  }
  res.json(createResponse(conf));
};

function wifiRegisterInternal(remoteConf, callback) {
  var conf = termDBFunction.readConfiguration(
    globaljs.termStatdb,
    remoteConf.macAddress
  );
  if (!conf) {
    // create configuration record
    conf = termDBFunction.readConfiguration(
      globaljs.termStatdb,
      remoteConf.macAddress,
      true,
      remoteConf
    );
    conf.lastUpdate = Date.now();
    // create programming default record if nont present
    termDBFunction.readProgramming(
      globaljs.termStatdb,
      globaljs.PROG_TEMP,
      true
    );
    termDBFunction.readProgramming(
      globaljs.termStatdb,
      globaljs.PROG_LIGHT,
      true
    );
  }
  if (conf) {
    // update last access
    conf.lastAccess = Date.now();
    // var p = myutils.httpGetParam(req);
    conf = updateConfigurationFromRequest(remoteConf, conf);
    termDBFunction.updateConfiguration(globaljs.termStatdb, conf);
    termDBFunction.saveDatabase(
      globaljs.termStatdb,
      "Save Database after wifiRegister completed"
    );
    var d = new Date();
    conf.timeZoneOffset = d.getTimezoneOffset();
  }
  var response = createResponse(conf);
  // if (callBack) callBack(response)
  return response;
}

/**
 * Register a wifi client by using its mac address
 */
var wifiRegister = function(req, res) {
  if (!checkSecurity(req, res)) return;
  var remoteConf = req.body;
  try {
    res.json(wifiRegisterInternal(remoteConf));
  } catch (error) {
    res.json(createResponse(null, 500, "Generic error : "+error));
  }  
};

/**
 * Cumulate statistics
 */
var cumulateStatistics = function(req, res, next) {
  if (!checkSecurity(req, res)) return;
  termDBStatFunction.cumulateStatistics(globaljs.termStatdb);
  res.json(createResponse());
};

/*
 * Solo funzioni utilizzate via WS da termClient ARDUINO
 */
function analizeWebsocketRestMessage(ws, message) {
  var response = createResponse(null, "100", "Nessuna risposta valida");
  if (message) {
    var req = JSON.parse(message);
    if (req._operation) {
      if (req._operation === "wifiRegister") {
        response = wifiRegisterInternal(req);
      } else if (req._operation === "monitor") {
      } else if (req._operation === "checkConfigurationChange") {
      } else if (req._operation === "getCurrentData") {
      } else {
        response = createResponse(
          null,
          "103",
          "Operazione " + req._operation + " non riconosciuta"
        );
      }
    } else {
      response = createResponse(null, "102", "Operazione non valida");
    }
  } else {
    response = createResponse(null, "101", "Messaggio vuoto");
  }
  response._operation = req._operation;
  return JSON.stringify(response);
}

var websocketRestWrapper = function(ws, req) {
  var ip = req.connection.remoteAddress;
  console.log("Client IP " + ip);
  ws.on("message", function incoming(message) {
    console.log("WEBSOCKET EVENT : message");
    console.log("received: %s", message);
    var response = analizeWebsocketRestMessage(ws, message);
    console.log("send : %s", response);
    ws.send(response);
    ws.ping();
  });
  ws.on("close", function incoming(code, reason) {
    console.log("WEBSOCKET EVENT : close");
    console.log("received: %d : %s", code, reason);
  });
  ws.on("open", function incoming(message) {
    console.log("WEBSOCKET EVENT : open");
    console.log("received: %s", message);
  });
  ws.on("ping", function incoming(message) {
    console.log("WEBSOCKET EVENT : ping");
    console.log("received: %s", message);
  });
  ws.on("pong", function incoming(message) {
    console.log("WEBSOCKET EVENT : pong");
    console.log("received: %s", message);
  });
  ws.on("error", function incoming(message) {
    console.log("WEBSOCKET EVENT : error");
    console.log("received: %s", message);
  });
};

module.exports.monitor = monitor;
module.exports.readDB = readDB;
module.exports.wifiRegisterGet = wifiRegisterGet;
module.exports.wifiRegister = wifiRegister;
module.exports.getProgramming = getProgramming;
module.exports.getStatistics = getStatistics;
module.exports.checkConfigurationChange = checkConfigurationChange;
module.exports.updateConfiguration = updateConfiguration;
module.exports.updateTempProgramming = updateTempProgramming;
module.exports.cumulateStatistics = cumulateStatistics;
module.exports.getCurrentData = getCurrentData;
module.exports.addProgramming = addProgramming;
module.exports.removeProgramming = removeProgramming;
module.exports.websocketRestWrapper = websocketRestWrapper;

const globaljs = require("./global");

let getStatistics = function(options, resolve, reject) {
  /**
   * finalize function for RELE
   */
  var _finalizeRele = function(key, value) {
    let outValue = value;
    if (typeof value.tot === "undefined") {
      outValue = {
        on: this.status ? 1 : 0,
        off: this.status ? 0 : 1,
        tot: 1
      };
    }

    return outValue;
  };
  /**
   * map function for RELE
   */
  var _mapRele = function() {
    var floorTimeSecond = function(interval, time) {
      var div = 60 * 1000 * interval;
      var l1 = time;
      var l2 = Math.floor(l1 / div) * div;
      return new Date(l2);
    };
    var out = {
      on: this.status ? 1 : 0,
      off: this.status ? 0 : 1,
      tot: 1
    };
    var key = {
      server: this.shellyId,
      time: floorTimeSecond(interval, this.time)
    };
    emit(key, out);
  };

  /**
   * reduce function for RELE
   * @param {*} key
   * @param {*} values
   */
  var _reduceRele = function(key, values) {
    var reduce = null;
    for (var index = 0; index < values.length; ++index) {
      var entry = values[index];
      if (reduce === null) {
        reduce = entry;
      } else {
        reduce.on += entry.on;
        reduce.off += entry.off;
        reduce.tot += entry.tot;
      }
    }
    return reduce;
  };

  /**
   * finalize function for SENSOR
   * @param {*} key
   * @param {*} value
   */
  var _finalizeSensor = function(key, value) {
    let outValue = value;
    if (typeof value.tot === "undefined") {
      outValue = {
        temperature: this.temperature,
        humidity: this.humidity,
        pressure: this.pressure,
        light: this.light,
        tot: 1
      };
    }
    outValue.temperature = outValue.temperature / outValue.tot;
    outValue.humidity = outValue.humidity / outValue.tot;
    outValue.pressure = outValue.pressure / outValue.tot;
    outValue.light = outValue.light / outValue.tot;
    return outValue;
  };
  /**
   * map function for SENSOR
   */
  var _mapSensor = function() {
    var floorTimeSecond = function(interval, time) {
      var div = 60 * 1000 * interval;
      var l1 = time;
      var l2 = Math.floor(l1 / div) * div;
      return new Date(l2);
    };
    var out = {
      temperature: this.temperature,
      humidity: this.humidity,
      pressure: this.pressure,
      light: this.light,
      tot: 1
    };
    var key = {
      server: this.macAddress,
      time: floorTimeSecond(interval, this.time)
    };
    emit(key, out);
  };
  /**
   * Reduce function for SENSOR
   * @param {*} key
   * @param {*} values
   */
  var _reduceSensor = function(key, values) {
    var reduce = null;
    for (var index = 0; index < values.length; ++index) {
      var entry = values[index];
      if (reduce === null) {
        reduce = entry;
      } else {
        reduce.temperature += entry.temperature;
        reduce.humidity += entry.humidity;
        reduce.pressure += entry.pressure;
        reduce.light += entry.light;
        reduce.tot += entry.tot;
      }
    }
    return reduce;
  };

  var _createResultFunction = function(err, values) {
    if (err) {
      console.log("ERROR in getStatistics mapReduce -  " + err);
      reject(err);
    } else {
      let compareValue = function(a, b) {
        return a === b ? 0 : a < b ? -1 : 1;
      };
      let compareFunction = function(a, b) {
        let c = compareValue(a._id.server, b._id.server);
        if (c === 0) return compareValue(a._id.time, b._id.time);
        return c;
      };
      var out = [];
      var sortedValues = values.sort(compareFunction);

      for (var ix = 0; ix < options.configuration.length; ix++) {
        options.configuration[ix].startTime = options.startTime;
        options.configuration[ix].endTime = options.endTime;
        options.configuration[ix].statistics = [];
        for (var i = 0; i < sortedValues.length; i++) {
          if (
            options.configuration[ix][options.keyField] ===
            sortedValues[i]._id.server
          ) {
            options.configuration[ix].statistics.push({
              time: sortedValues[i]._id.time.getTime(),
              value: sortedValues[i].value
            });
          }
        }
      }
      options.response = options.configuration;
      resolve(options);
    }
  };

  var floorTimeSecond = function(interval, time) {
    var div = 60 * 1000 * interval;
    var l1 = time;
    var l2 = Math.floor(l1 / div) * div;
    return new Date(l2);
  };
  let st = floorTimeSecond(options.interval, options.startTime);
  let et = floorTimeSecond(options.interval, options.endTime);
  options.startTime = st.getTime();
  options.endTime = et.getTime();
  var query = {
    $and: [
      {
        time: {
          $gte: options.startTime
        }
      },
      {
        time: {
          $lt: options.endTime
        }
      }
    ]
  };
  // statistiche sensori Temperatura
  // singola e media
  // statistiche altri sensori (luce / umidita / pressione)
  // recupero sensosi
  // per ogni sensore map/reduce per statitiche
  // input tipo (ultima ora /giorno)
  //       risoluzione (minuti)
  /*
  console.log(
    "Collect Statistics from " +
      new Date(options.startTime) +
      " to " +
      new Date(options.endTime) +
      " of type " +
      options.statisticType
  );
    */
  if (options.statisticType === "RELE") {
    options.keyField = "shellyMqttId";
    globaljs.mongoCon.collection(globaljs.MONGO_SHELLYSTAT).mapReduce(
      _mapRele,
      _reduceRele,
      {
        query: query,
        out: {
          inline: 1
        },
        scope: {
          interval: options.interval
        },
        finalize: _finalizeRele
      },
      _createResultFunction
    );
  } else {
    options.keyField = "macAddress";
    globaljs.mongoCon.collection(globaljs.MONGO_SENSORSTAT).mapReduce(
      _mapSensor,
      _reduceSensor,
      {
        query: query,
        out: {
          inline: 1
        },
        scope: {
          interval: options.interval,
          keyField: "macAddress"
        },
        finalize: _finalizeSensor
      },
      _createResultFunction
    );
  }
};

exports.getStatistics = getStatistics;

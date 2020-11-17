//var http = require("http");
//var webSocket = require("ws");
//var globaljs = require("./global");

var mapGet = function(map, key) {
  var ret;
  if (map) {
    for (var i = 0, len = map.length; i < len; i++) {
      var entry = map[i];
      if (entry.key === key) {
        ret = entry.value;
        break;
      }
    }
    /*
     * map.forEach(function f(entry) { if (entry.key === key) { ret =
     * entry.value; } });
     */
  }
  return ret;
};

var mapPut = function(map, key, value) {
  if (map) {
    var found = false;
    for (
      var i = 0, len = map.length;
      i < len;
      i++ // for (var entry in map)
    ) {
      var entry = map[i];
      if (entry.key === key) {
        found = true;
        entry.value = value;
        break;
      }
    }
    /*
     * map.forEach(function f(entry) { if (entry.key === key) { found = true;
     * entry.value = value; } });
     */
    if (!found) {
      var entry = {
        key: key,
        value: value
      };
      map.push(entry);
    }
  }
};

var floorTime = function(interval, time, isSecond) {
  var div = 1000 * interval;
  if (typeof isSecond == "undefined" || !isSecond) div = div * 60;
  var now = time === null ? new Date() : time;
  var l1 = now;
  var l2 = Math.floor(l1 / div) * div;
  return new Date(l2);
};

module.exports.floorTime = floorTime;
module.exports.mapPut = mapPut;
module.exports.mapGet = mapGet;

const origlog = console.log;

const getCurrentDateFormat = function() {
  var dateStr = new Date().toLocaleString(); // default date format
  dateStr = new Date().toLocaleString();
  return dateStr + " ";
};

log = function(obj, ...argumentArray) {
  var datePrefix = getCurrentDateFormat() + " : ";
  if (typeof obj === "string") {
    argumentArray.unshift(datePrefix + obj);
  } else {
    // This handles console.log( object )
    argumentArray.unshift(obj);
    argumentArray.unshift(datePrefix);
  }
  origlog.apply(this, argumentArray);
};

module.exports.log = log;

let validateNumber = function(num) {
  return num && !isNaN(num);
};

exports.validateNumber = validateNumber;

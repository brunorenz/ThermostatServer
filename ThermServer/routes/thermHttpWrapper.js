var config = require("./config");
var thermManager = require("./thermManager");

/**
 * Add programming record
 * @param {*} options
 * @param {*} resolve
 * @param {*} reject
 */

let getProgramming = function (options, resolve, reject) {
  let type = options.request.type;
  if (type === undefined) type = config.TypeProgramming.TEMP;
  options.programmingType = type;
  options.action = config.TypeAction.READ;
  thermManager.manageProgramming(options, resolve, reject);
};

exports.getProgramming = getProgramming;

/**
 * Add Programming Record
 */
let addProgramming = function (options, resolve, reject) {
  let type = options.request.type;
  if (type === undefined) reject("Missing request parameters!");
  options.programmingType = type;
  options.action = config.TypeAction.ADD;
  thermManager.manageProgramming(options, resolve, reject);
};

exports.addProgramming = addProgramming;

/**
 * Update programming record
 * @param {*} options
 * @param {*} resolve
 * @param {*} reject
 */
let updateProgramming = function (options, resolve, reject) {
  let type = options.request.type;
  let program = options.request.program;
  if (type === undefined || program === undefined) reject("Missing request parameters!");
  options.programmingType = type;
  options.program = program;
  options.action = config.TypeAction.UPDATE;
  thermManager.manageProgramming(options, resolve, reject);
};
exports.updateProgramming = updateProgramming;

/**
 * Delete programming record
 * @param {*} options
 * @param {*} resolve
 * @param {*} reject
 */
let deleteProgramming = function (options, resolve, reject) {
  let type = options.request.type;
  let idProg = options.request.id;
  if (type === undefined || idProg === undefined) reject("Missing request parameters!");
  options.programmingType = type;
  options.idProg = idProg;
  options.action = config.TypeAction.DELETE;
  thermManager.manageProgramming(options, resolve, reject);
};

exports.deleteProgramming = deleteProgramming;

let getReleStatistics = function (options, resolve, reject) {
  options.request.statisticType = "RELE";
  getStatistics(options, resolve, reject);
};

exports.getReleStatistics = getReleStatistics;

let getSensorStatistics = function (options, resolve, reject) {
  options.request.statisticType = "SENSOR";
  getStatistics(options, resolve, reject);
};

exports.getSensorStatistics = getSensorStatistics;

var getStatistics = function (options, resolve, reject) {
  options.depth = 24; //  hour
  options.interval = 15; //minutes
  if (options.request.type != undefined) {
    options.depth = options.request.type === "hour" ? 1 : 24;
    options.interval = options.depth === 1 ? 5 : 15;
  }
  if (options.request.interval != undefined) options.interval = parseInt(options.request.interval);

  thermManager.getStatistics(options, resolve, reject);
};

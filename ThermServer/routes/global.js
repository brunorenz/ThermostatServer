var urlDB = "localhost:27017/HTTPLog";

var serverPort = 8100;
var dbName = "/DB/termStat.db";
var termStatdb;
const CONF = "conf";
const LOG = "log";
const PROG = "prog";
const STAT = "stat";

// const PREFIX = '/term';

var monitorTimeout = 30000;
var basicAuth = "Basic YnJ1bm86cHdk";
var basicAuthRequired = false;

var minTemp = 17.0;
var minTempOn = 21.0;
var minLight = 30.0;
var startTime1 = 6 * 60;
var endTime1 = 7 * 60 + 30;

var startTime2 = 18 * 60 + 30;
var endTime2 = 23 * 60;
var interval = 15;

// programming type
var progTemp = 1;
var progLight = 2;
// Temperature measurement
var tempLocal = 1;
var tempMedium = 2;
var tempPriority = 3;
// staus
var statusOff = 0;
var statusOn = 1;
var statusManual = 2;
var statusAutomatic = 3;
//
var wss;

exports.SERVER_PORT = serverPort;
exports.DB_NAME = dbName;
exports.termStatdb = termStatdb;
exports.MONITOR_TIMEOUT = monitorTimeout;
exports.BASIC_AUTH = basicAuth;
exports.BASIC_AUTH_REQUIRED = basicAuthRequired;

exports.MIN_TEMP_OFF = minTemp;
exports.MIN_TEMP_ON = minTempOn;
exports.MIN_LIGHT_OFF = minLight;
exports.TIME_START1 = startTime1;
exports.TIME_START2 = startTime2;
exports.TIME_END1 = endTime1;
exports.TIME_END2 = endTime2;
exports.INTERVAL = interval;

exports.CONF = CONF;
exports.LOG = LOG;
exports.PROG = PROG;
exports.STAT = STAT;

exports.TEMP_LOCAL = tempLocal;
exports.TEMP_MEDIUM = tempMedium;
exports.TEMP_PRIORITY = tempPriority;

exports.PROG_TEMP = progTemp;
exports.PROG_LIGHT = progLight;

exports.STATUS_OFF = statusOff;
exports.STATUS_ON = statusOn;
exports.STATUS_MAN = statusManual;
exports.STATUS_AUTO = statusAutomatic;
exports.WSS = wss;

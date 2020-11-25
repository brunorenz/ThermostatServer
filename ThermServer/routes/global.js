// MongoDB configuration
var home = false;
const security = true;
const jwt = true;
const jwtGET = false;
const jwtPOST = true;

var urlDB_ = "192.168.0.101:27017";
var urlDB = home ? "192.168.0.101:27017" : "srvwas1.bpbari.it:27017";
var DBName = "ThermDB";
var mongoCon;

exports.DBName = DBName;
exports.urlDB = urlDB;
exports.mongoCon = mongoCon;

exports.MONGO_CONF = "configuration";
exports.MONGO_PROG = "prog";
exports.MONGO_SENSORSTAT = "sensorStat";
exports.MONGO_SHELLYSTAT = "shellyStat";
exports.MONGO_MOTIONSTAT = "motionStat";

// MQTT
var urlMQTT_ = "mqtt://192.168.0.101";
var urlMQTT = home ? "mqtt://192.168.0.101" : "mqtt://172.28.154.233";
var mqttCli;
exports.urlMQTT = urlMQTT;
exports.mqttCli = mqttCli;

exports.MQTopicWifi = "ThermApp/wifiRegister";
exports.MQTopicMonitor = "ThermApp/monitorData";
exports.MQTopicMotion = "ThermApp/motionSensor";
exports.MQTopicLastWill = "ThermApp/lastWill";
exports.MQTopicUpdateProgramming = "ThermApp/updateProgramming";
exports.MQTopicUpdateTemperature = "ThermApp/updateTemperature";
exports.MQTopicProgramming = "ThermApp/getProgramming";
exports.MQTopicShellies = "shellies/#";

// HTTP
var serverPort = 8101;
//var dbName = "/DB/termStat.db";
//var termStatdb;

// cahce
var shellyCache = [];

// const PREFIX = '/term';

const monitorTimeout = 30000;
exports.MONITOR_TIMEOUT = monitorTimeout;

// Security
//exports.JWTEnable = false;
//exports.JWTSecret = "Piripiccio2020";
//exports.JWTExpire = "1h"; // 1000 * 60 * 60 * 1; // un'ora

exports.JWT = {
  enabled: jwt,
  securityGET: jwtGET,
  securityPOST: jwtPOST,
  secret: "Piripiccio2020",
  expire: "1h",
};

var basicAuth = "Basic YWRtaW46YWgwNjB2eUEu";
var basicAuthRequired = security;
var basicAuthShelly = "Basic YWRtaW46YWgwNjB2eUEu";

var minTemp = 17.0;
var minTempOn = 21.0;
var minLight = 30.0;
var startTime1 = 6 * 60;
var endTime1 = 7 * 60 + 30;

var startTime2 = 18 * 60 + 30;
var endTime2 = 23 * 60;

var startTimeL = 6 * 60;
var endTimeL = 23 * 60;

var interval = 15;

var wss;

exports.shellyCache = shellyCache;
exports.basicAuthShelly = basicAuthShelly;

exports.SERVER_PORT = serverPort;
exports.MONITOR_TIMEOUT = monitorTimeout;
exports.BASIC_AUTH = basicAuth;
exports.BASIC_AUTH_REQUIRED = basicAuthRequired;

exports.MIN_TEMP_OFF = minTemp;
exports.MIN_TEMP_ON = minTempOn;
exports.MIN_LIGHT_OFF = minLight;
exports.TIME_START1 = startTime1;
exports.TIME_START2 = startTime2;
exports.TIME_STARTL = startTimeL;
exports.TIME_END1 = endTime1;
exports.TIME_END2 = endTime2;
exports.TIME_ENDL = endTimeL;
exports.INTERVAL = interval;

exports.WSS = wss;

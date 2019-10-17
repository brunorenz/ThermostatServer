var globaljs = require('./global');

var saveDB = function(termStatdb, msg)
{
  if (!msg)
	msg = "Save Database after update/insert operations";
  termStatdb.saveDatabase(function()
  {
	console.log(msg);
  });
};

function getLogRecord()
{
  var statRercord = {
	idDisp : 0,
	tmsUpd : 0,
	temperature : 0.0,
	humidity : 0.0,
	pressure : 0.0,
	light : 0.0,
	status : 0,
	numSurveys : 0
  };
  return statRercord;
}

/**
 * Init DB Collection
 */
var initDB = function(termStatdb, coll, options, entry)
{
  var log = termStatdb.getCollection(coll);
  if (log === null)
  {
	log = options ? termStatdb.addCollection(coll, options) : termStatdb.addCollection(coll);
	console.log('Init ' + coll + ' collection..');
  }
  if (log.count() === 0 && entry)
  {
	log.insert(entry);
  }
  console.log(coll + ' collection size : ' + log.count());
};

var getConfigurationRecord = function(macAddress)
{
  var confRecord = {
	macAddress : macAddress,
	ipAddress : "" ,
	location : "change location name",
	tempMeasure : globaljs.TEMP_LOCAL,
	status : globaljs.STATUS_OFF,
	statusLight : globaljs.STATUS_OFF,
	lastAccess : 0,
	lastUpdate : 0,
	lastCheck : 0,
	flagLcd : 0,
	flagLightSensor : 0,
	flagMotionSensor : 0,
	flagReleTemp : 0,
	flagReleLight : 0
  };
  return confRecord;
};

var getProgrammingEntryRecord = function(idProg, name)
{

  var programmigInfo = {
	idProg : idProg,
	name : name,
	minTemp : 0.0,
	minTempManual : 0.0,
	minLight : 0.0,
	dayProgramming : []
  };
  return programmigInfo;
};

var getDayProgramRecord = function(day)
{
  var dayProg = {
	idDay : day,
	prog : []
  };
  return dayProg;
};

var getProgrammingTempRecord = function(idType)
{
  var confRecord = {
	idProgType : 0,
	lastUpdate : 0,
	activeProg : -1,
	programming : []
  };
  return confRecord;
};

function getDefaultDayProgrammingTempRecord(id, name)
{
  var prog = getProgrammingEntryRecord(id, name);
  prog.minTemp = globaljs.MIN_TEMP_OFF;
  prog.minTempManual = globaljs.MIN_TEMP_ON;
  prog.minLight = globaljs.MIN_LIGHT_OFF;
  for (var day = 0; day < 7; day++)
  {
	var dayProg = getDayProgramRecord(day);
	var morning = {
	  timeStart : globaljs.TIME_START1,
	  timeEnd : globaljs.TIME_END1,
	  minTemp : globaljs.MIN_TEMP_ON,
	  priorityDisp : 0
	};
	var nigth = {
	  timeStart : globaljs.TIME_START2,
	  timeEnd : globaljs.TIME_END2,
	  minTemp : globaljs.MIN_TEMP_ON,
	  priorityDisp : 0
	};
	dayProg.prog.push(morning);
	dayProg.prog.push(nigth);
	prog.dayProgramming[day] = dayProg;
  }
  return prog;
}

function getDefaultProgrammingTempRecord(idType)
{
  var conf = getProgrammingTempRecord(idType);
  conf.idProgType = idType;
  conf.activeProg = 0;
  conf.lastUpdate = Date.now();
  var prog = getDefaultDayProgrammingTempRecord(0, 'Default Program');
  conf.programming[0] = prog;
  return conf;
}

var getDefaultProgrammingRecord = function(idType)
{
  var conf;
  if (idType === globaljs.PROG_TEMP)
  {
	conf = getDefaultProgrammingTempRecord(idType);
  } else if (idType === globaljs.PROG_LIGHT)
  {
	var confRecord = {
	  idProgType : globaljs.PROG_LIGHT,
	  lastUpdate : Date.now(),
	  programming : []
	};
	conf = confRecord;
  }
  return conf;
};

/**
 * Initialize all DB Collections
 */
var DBInitialize = function(termStatdb)
{
  var logOptions = {
	indices : [ 'tmsUpd' ]
  };
  var statOptions = {
	indices : [ 'day' ]
  };

  initDB(termStatdb, globaljs.LOG, logOptions);
  initDB(termStatdb, globaljs.CONF);
  initDB(termStatdb, globaljs.PROG);
  initDB(termStatdb, globaljs.STAT, statOptions);
};

/**
 * Update Configuration record
 */
var updateConfiguration = function(termStatdb, conf)
{
  termStatdb.getCollection(globaljs.CONF).update(conf);
  return 0;
};

/**
 * Read configuration.i if not found and createIfNull is true a default
 * configuration is created
 */
var readConfiguration = function(termStatdb, macAddress, createIfNull)
{
  var confColl = termStatdb.getCollection(globaljs.CONF);
  var conf = confColl.findOne({
	'macAddress' : macAddress,
  });
  if (conf)
  {
	console.log("Configuration found for macAddress : " + macAddress);
  } else
  {
	if (createIfNull)
	{
	  // ADD
	  console.log("Configuration not found for macAddress : " + macAddress + " .. add default");
	  conf = getConfigurationRecord(macAddress, 0);
	  conf.lastAccess = Date.now();
	  conf.lastUpdate = conf.lastAccess;
	  confColl.insert(conf);
	}
  }
  return conf;
};

/**
 * Read Configuration using key
 */
var readConfigurationByKey = function(termStatdb, key, check)
{
  var confColl = termStatdb.getCollection(globaljs.CONF);
  var conf = confColl.get(parseInt(key));
  if (conf && check && check === true)
	{
		conf.lastCheck = Date.now();
		confColl.update(conf);
	}
  return conf;
};

var resetProgramming = function(termStatdb, key)
{
  var idProgType = parseInt(key);
  var confColl = termStatdb.getCollection(globaljs.PROG);
  var conf = confColl.findOne({
	'idProgType' : idProgType
  });
  if (conf)
  {
	console.log("Reset programming info for type  : " + idProgType);
	confColl.remove(conf);
	conf = getDefaultProgrammingRecord(idProgType);
	confColl.insert(conf);
  }
  return conf;
};

var deleteProgramming = function(termStatdb, key, id)
{
  var idProgType = parseInt(key);
  var idProg = parseInt(id);
  var confColl = termStatdb.getCollection(globaljs.PROG);
  var conf = confColl.findOne({
	'idProgType' : idProgType
  });
  var update = false;
  if (conf)
  {
	console.log("Rest programming info for type  : " + idProgType);
	var newProg;
	var last = conf.programming.length;
	if (idProgType === globaljs.PROG_TEMP && last > 1)
	{
	  var arr = conf.programming.filter(function(item)
	  {
		return item.idProg !== idProg;
	  });
	  if (arr.length !== last)
	  {
		conf.programming = arr;
		console.log("Remove idProg " + idProg);
		update = true;
	  }
	} else if (idProgType === globaljs.PROG_LIGHT)
	{

	}
	if (update)
	  confColl.update(conf);
  }
  return conf;

}

var addProgramming = function(termStatdb, key)
{
  var idProgType = parseInt(key);
  var confColl = termStatdb.getCollection(globaljs.PROG);
  var conf = confColl.findOne({
	'idProgType' : idProgType
  });
  if (conf)
  {
	console.log("Rest programming info for type  : " + idProgType);
	var newProg;
	// confColl.remove(conf);
	var last = conf.programming.length;
	if (idProgType === globaljs.PROG_TEMP)
	{
	  newProg = getDefaultDayProgrammingTempRecord(last, 'Program number ' + (last + 1));
	} else if (idProgType === globaljs.PROG_LIGHT)
	{

	}
	if (newProg)
	  conf.programming.push(newProg);
	confColl.update(conf);
  }
  return conf;
};

/**
 * Read programming record
 */
var readProgramming = function(termStatdb, key, createOfNull)
{
  var idProgType = parseInt(key);
  var confColl = termStatdb.getCollection(globaljs.PROG);
  var conf = confColl.findOne({
	'idProgType' : idProgType
  });
  if (conf)
  {
	console.log("Programming info found for type  : " + idProgType);
  } else
  {
	if (createOfNull)
	{
	  // ADD
	  console.log("Programming info not found for type : " + idProgType + " .. add default");
	  conf = getDefaultProgrammingRecord(idProgType);
	  confColl.insert(conf);
	}
  }
  return conf;
};

/**
 * Update LOG record
 */
var updateTermLog = function(termStatdb, conf, logRecord)
{
  if (conf)
  {
	// console.log("processMonitorData : "+JSON.stringify(logRecord));
	var log = getLogRecord();
	log.idDisp = conf.$loki;
	log.temperature = logRecord.temperature;
	log.humidity = logRecord.humidity;
	log.pressure = logRecord.pressure;
	log.tmsUpd = new Date().getTime();
	log.status = logRecord.status;
	log.numSurveys = logRecord.numSurveys;
	log.light = logRecord.light;
	if (termStatdb)
	{
	  var logColl = termStatdb.getCollection(globaljs.LOG);
	  if (logColl)
	  {
		logColl.insert(log);
	  }
	}

  }
};

var readCollection = function(termStatdb, options)
{
  var coll = termStatdb.getCollection(options.collection);
  if (coll)
  {
	var conf;
	if (options.key && options.key !== 0)
	{
	  conf = coll.get(options.key);
	} else
	{
	  var sort = true;
	  if (options.sort && options.sort === 'a')
		sort = false;
	  conf = coll.chain().simplesort('$loki', sort).limit(options.maxRecords).data();
	}

	return conf;
  } else
  {
	return {};
  }
};

module.exports.updateTermLog = updateTermLog;
module.exports.updateConfiguration = updateConfiguration;
module.exports.readProgramming = readProgramming;
module.exports.DBInitialize = DBInitialize;
module.exports.resetProgramming = resetProgramming;
module.exports.addProgramming = addProgramming;
module.exports.deleteProgramming = deleteProgramming;
module.exports.readConfiguration = readConfiguration;
module.exports.readConfigurationByKey = readConfigurationByKey;
module.exports.readCollection = readCollection;
module.exports.saveDatabase = saveDB;

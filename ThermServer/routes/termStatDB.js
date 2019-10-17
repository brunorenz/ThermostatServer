var globaljs = require('./global');
var termDBFunction = require('./termDB');
var moment = require('moment');

function setTime(date, start)
{
	if (start === true)
	{
		date.setHours(0);
		date.setMinutes(0);
		date.setSeconds(1);
		date.setMilliseconds(0);
	} else
	{
		date.setHours(23);
		date.setMinutes(59);
		date.setSeconds(59);
		date.setMilliseconds(999);
	}
	return date;
}

function getStatisticRecord(idDisp)
{
	var stat =
	{
		idDisp : idDisp,
		day : 0,
		tms : 0,
		temperature : 0,
		pressure : 0,
		humidity : 0,
		light : 0,
		status : 0,
		numSurveys : 0
	};
	return stat;
}

/**
 * Map Function
 */

function mapStatFunction(record)
{
	var logs =
	{
		temperature : 0,
		pressure : 0,
		humidity : 0,
		status : 0,
		light : 0,
		tms : 0
	};
	logs.temperature = record.temperature;
	logs.pressure = record.pressure;
	logs.numSurveys = record.numSurveys;
	logs.humidity = record.humidity;
	logs.tms = record.tmsUpd;
	logs.status = record.status;
	logs.light = record.light ? record.light : 0;
	return logs;
}

/**
 * ReduceFunction
 */
function reduceStatFunction(record, param)
{
	function getStatRecord(key)
	{
		var record =
		{
			statusOn : 0,
			temperature : 0,
			pressure : 0,
			humidity : 0,
			light : 0,
			minTemperature : +99,
			maxTemperature : -99,
			count : 0,
			numSurveys : 0,
			time : new Date(key).getTime(),
			interval : param.interval
		};
		return record;
	}
	var getKey = function(tms)
	{
		var intMs = param.interval * 1000 * 60;
		var t = Math.round(tms / intMs) * intMs;
		return t;
	};
	function compute(rec)
	{
		if (rec && rec.count > 0)
		{
			rec.temperature = rec.temperature / rec.count;
			rec.pressure = rec.pressure / rec.count;
			rec.humidity = rec.humidity / rec.count;
			rec.light = rec.light / rec.count;

		}
		return rec;
	}
	var outStat = [];

	var oldKey;
	var curRec;
	if (record.length > 0)
	{
		record.forEach(function(elt, i)
		{
			var key = getKey(elt.tms);
			if (!curRec)
			{
				curRec = getStatRecord(key);
				oldKey = key;
			}
			if (key !== oldKey)
			{
				outStat.push(compute(curRec));
				curRec = getStatRecord(key);
				oldKey = key;
			}
			if (elt.temperature)
				curRec.temperature += elt.temperature;
			if (elt.pressure)
				curRec.pressure += elt.pressure;
			if (elt.humidity)
				curRec.humidity += elt.humidity;
			if (elt.light)
				curRec.light += elt.light;
			curRec.numSurveys += elt.numSurveys;
			if (elt.status !== 0)
				curRec.statusOn += elt.numSurveys;
			curRec.count++;
			if (elt.temperature < curRec.minTemperature)
				curRec.minTemperature = elt.temperature;
			if (elt.temperature > curRec.maxTemperature)
				curRec.maxTemperature = elt.temperature;
		});
		outStat.push(compute(curRec));
	}
	return outStat;
}

var cumulateStatistics = function(termStatdb)
{
	// for each idDisp do
	// - read last stat date
	// -- cumulate all missing date

	var myReduceFuncion = function(record)
	{
		// var param =
		return reduceStatFunction(record,
		{
			interval : globaljs.INTERVAL
		});
	};

	var options =
	{
		collection : globaljs.CONF,
		key : 0,
		maxRecords : 100
	};
	var res = termDBFunction.readCollection(termStatdb, options);
	// checkError
	if (res && res.length > 0)
	{
		var stat = termStatdb.getCollection(globaljs.STAT);
		var logs = termStatdb.getCollection(globaljs.LOG);
		for (var i = 0; i < res.length; i++)
		{
			var conf = res[i];
			console.log("Process id " + conf.$loki + " at " + conf.location + " : "
					+ conf.macAddress);

			var lastDate = stat.chain().simplesort("day", true).limit(1).data();
			var d1;
			var d2 = moment().subtract(1, 'd');
			if (lastDate)
			{
				if (lastDate.length > 0)
				{
					console.log("Ultima data " + new Date(lastDate[0].day));
					d1 = moment(lastDate[0].day).add(1, 'd');
				} else
				{
					console.log("Nessun record trovato ..");
					var firstDate = logs.chain().find(
					{
						idDisp : conf.$loki
					}).simplesort('tmsUpd', false).limit(1).data();
					if (firstDate && firstDate.length > 0)
					{
						d1 = moment(firstDate[0].tmsUpd);
						console.log("First date " + d1.format() + " - " + firstDate.tmsUpd);
					}
				}
			}
			if (d1 && d2)
			{
				var n = d2.startOf('day').diff(d1.startOf('day'), 'd') + 1;
				console.log("Start Date " + d1.format() + " - End Date " + d2.format()
						+ " - Totale day " + n);
				// n = 1;
				for (var j = 0; j < n; j++)
				{
					var dS = moment(d1).startOf('day');
					var dE = moment(d1).endOf('day');
					console.log("Create DB statistics for idDisp " + conf.$loki
							+ " from " + dS.format() + " to " + dE.format());
					d1.add(1, 'd');
					var resLog = logs.chain().find(
					{
						$and : [
						{
							idDisp : conf.$loki
						},
						{
							tmsUpd :
							{
								$between : [ dS, dE ],
							}

						} ]
					}).simplesort('tmsUpd').mapReduce(mapStatFunction, myReduceFuncion);
					if (resLog)
					{
						console.log("Found " + resLog.length + " records");
						for (var y = 0; y < resLog.length; y++)
						{
							var lr = resLog[y];
							var statRec = getStatisticRecord(conf.$loki);
							statRec.day = dS.toDate().getTime();
							statRec.tms = lr.time;
							statRec.temperature = lr.temperature;
							statRec.pressure = lr.pressure;
							statRec.humidity = lr.humidity;
							statRec.light = lr.light;
							statRec.numSurveys = lr.numSurveys;
							stat.insert(statRec);
						}
						var logsToDelete = logs.chain().find(
						{
							$and : [
							{
								idDisp : conf.$loki
							},
							{
								tmsUpd :
								{
									$between : [ dS, dE ],
								}

							} ]
						}).data();
						console.log("Delete " + logsToDelete.length
								+ " records from LOGS collection");
						for (var y = 0; y < logsToDelete.length; y++)
						{
							logs.remove(logsToDelete[y]);
						}
					}
				}
				termStatdb.saveDatabase(function()
				{
					console.log("Save Database after STATS collection update completed");
				});
			}
		}
	}

};

var getStatistics = function(termStatdb, conf, param)
{
	var oldKey;
	var tmpMap;
	var tmpMapOut;

	var myReduceFuncion = function(record)
	{
		return reduceStatFunction(record, param);
	};

	var d1, d2;
	var logColl = termStatdb.getCollection(globaljs.LOG);
	if (!param)
	{
		param =
		{
			type : 'day',
			interval : 5
		};
	} else
	{
		if (!param.type)
			param.type = 'day';
		if (!param.interval)
			param.interval = 5;
	}

	if (param.type === 'week')
	{
		d1 = setTime(new Date(), true);
		d2 = setTime(new Date(), false);
	} else
	{
		// assumo day come default
		d1 = setTime(new Date(), true);
		d2 = setTime(new Date(), false);
	}
	// if (!interval)
	// var result = logColl.mapReduce(mapFunction, reduceFunction);
	console.log("getStatistics :  type " + param.type + " from " + d1 + " to "
			+ d2 + " with interval of " + param.interval + " minutes");
	var res = logColl.chain().find(
	{
		$and : [
		{
			idDisp : conf.$loki
		},
		{
			tmsUpd :
			{
				$between : [ d1, d2 ],
			}

		} ]
	}).simplesort('tmsUpd').mapReduce(mapStatFunction, myReduceFuncion);
	var out =
	{
		startTime : d1.getTime(),
		endTime : d2.getTime(),
		data : res
	};
	return out;
};

module.exports.getStatisticRecord = getStatisticRecord;
module.exports.getStatistics = getStatistics;
module.exports.cumulateStatistics = cumulateStatistics;

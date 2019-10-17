const MAX_PROGDAY = 4;
const STAT_INTERVAL = 30;

function includeHTML()
{
  var z, i, elmnt, file, xhttp;
  /* loop through a collection of all HTML elements: */
  z = document.getElementsByTagName("*");
  for (i = 0; i < z.length; i++)
  {
	elmnt = z[i];
	/* search for elements with a certain atrribute: */
	file = elmnt.getAttribute("w3-include-html");
	if (file)
	{
	  /* make an HTTP request using the attribute value as the file name: */
	  xhttp = new XMLHttpRequest();
	  xhttp.onreadystatechange = function()
	  {
		if (this.readyState == 4)
		{
		  if (this.status == 200)
		  {
			elmnt.innerHTML = this.responseText;
		  }
		  if (this.status == 404)
		  {
			elmnt.innerHTML = "Page not found.";
		  }
		  /* remove the attribute, and call this function once more: */
		  elmnt.removeAttribute("w3-include-html");
		  includeHTML();
		}
	  };
	  xhttp.open("GET", file, true);
	  xhttp.send();
	  /* exit the function: */
	  return;
	}
  }
}

/**
 * Return base parameter for HighCharts
 * 
 * @param l1
 * @param l2
 * @returns
 */
function getHighchartsOptions(l1, l2)
{
  var hchartOptions = {
	chart : {
	  type : 'spline'
	},
	title : {
	  text : l1
	},
	subtitle : {
	  text : ''
	},
	xAxis : {
	  categories : []
	},
	yAxis : {
	  title : {
		text : l2
	  }
	},
	plotOptions : {
	  line : {
		dataLabels : {
		  enabled : true
		},
		enableMouseTracking : false
	  }
	},
	series : [ {
	  name : '',
	  data : []
	} ]
  };
  return hchartOptions;
}

/**
 * Pad a number with 0
 * 
 * @param n
 * @param width
 * @param z
 * @returns
 */
function pad(n, width, z)
{
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

/**
 * Return an index of a time array according a specific interval of minutes
 * 
 * @param date
 * @param interval
 * @returns
 */
function getIndex(date, interval)
{
  var d = new Date(date);
  var h = d.getHours();
  var m = d.getMinutes();
  var ix = (h * 60 + m) / interval;
  return ix;
}

/**
 * Display daily statistics
 * 
 * @param config
 * @returns
 */
function displayMonitorHighChart(config)
{
  var dataT = getHighchartsOptions('Andamento Temperatura nella giornata corrente', 'Temperatura (°C)');
  var dataP = getHighchartsOptions('Andamento Pressione nella giornata corrente', 'Millibar');
  var dataL;
  if (config.flagLightSensor === 1)
	dataL = getHighchartsOptions('Andamento Intensità luce nella giornata corrente', '%');
  var dataU = getHighchartsOptions('Andamento Umidità nella giornata corrente', '%');
  var id = parseInt(config.$loki);
  var interval = STAT_INTERVAL;
  $.ajax({
	type : "GET",
	url : "./rest/getStatistics/" + id + "?interval=" + interval,
	// contentType : "application/json; charset=utf-8",
	dataType : "json",
	success : function(data, status, jqXHR)
	{
	  if (data.error.code === 0)
	  {
		var firstIx = 0;
		var lastIx = 1440 / interval | 0;
		var logData = data.data.data;
		if (logData)
		{
		  if (logData.length > 0)
		  {
			firstIx = getIndex(logData[0].time, interval);
			lastIx = getIndex(logData[logData.length - 1].time, interval)
		  }
		}

		var rowsT = [];
		var rowsP = [];
		var rowsL = [];
		var rowsU = [];
		var ix = 0;
		for (var i = 0; i < 1440; i += interval)
		{
		  var h = i / 60 | 0;
		  var m = i % 60;

		  var lT = pad(h, 2) + ':' + pad(m, 2);
		  var lP = pad(h, 2) + ':' + pad(m, 2);
		  var lL = pad(h, 2) + ':' + pad(m, 2);
		  var lU = pad(h, 2) + ':' + pad(m, 2);
		  if (ix >= firstIx && ix <= lastIx)
		  {
			rowsT.push(lT);
			rowsP.push(lP);
			rowsU.push(lU);
			dataT.xAxis.categories.push(lT);
			dataP.xAxis.categories.push(lP);
			dataU.xAxis.categories.push(lU);
			if (config.flagLightSensor === 1)
			{
			  rowsL.push(lL);
			  dataL.xAxis.categories.push(lL);
			}
		  }
		  ix++;
		}

		for (var i = 0; i < logData.length; i++)
		{
		  var entry = logData[i];
		  ix = getIndex(entry.time, interval);
		  var a = parseFloat(Number(entry.temperature).toFixed(2));
		  var b = parseFloat(Number(entry.pressure).toFixed(2));
		  var c = parseFloat(Number(entry.humidity).toFixed(2));
		  dataT.series[0].data.push(a); // entry.temperature);
		  dataP.series[0].data.push(b); // entry.pressure);
		  dataU.series[0].data.push(c); // entry.humidity;
		  if (config.flagLightSensor === 1)
		  {
			dataL.series[0].data.push(parseFloat(Number(entry.light).toFixed(2)));
		  }

		}

		Highcharts.chart('plot1', dataT);
		Highcharts.chart('plot2', dataP);
		Highcharts.chart('plot3', dataU);
		if (config.flagLightSensor === 1)
		{
		  Highcharts.chart('plot4', dataL);
		}
		$('#DayStatistics').collapse('show');

	  }

	},

	error : function(jqXHR, status)
	{
	  // error handler
	  var a = status;
	}
  });

}

/**
 * Add e programming entry of a specific type
 * 
 * @param type
 * @returns
 */
function addProgramming(type)
{
  $.ajax({
	type : "GET",
	url : "./rest/addProgramming?type=" + type,
	// contentType : "application/json; charset=utf-8",
	dataType : "json",
	success : function(data, status, jqXHR)
	{
	  if (data.error.code === 0)
	  {
	  }
	},

	error : function(jqXHR, status)
	{
	  // error handler
	}
  });
}

function cleanProgData()
{
  for (var ix = 0; ix < MAX_PROGDAY; ix++)
  {
  }
}

function removeArrayEntry(arrayIn, ix)
{
  var arrayOut = [];
  for (var i = 0; i < arrayIn.length; i++)
  {
	if (i !== ix)
	{
	  arrayOut.push(arrayIn[i]);
	}
  }
  return arrayOut;
}

function manageProgData(action, datiProgrammazione, index)
{
  var prog = datiProgrammazione.data.programming[datiProgrammazione.currentProgram];
  var dayProg = prog.dayProgramming[datiProgrammazione.currentDay].prog;
  var lastIx = dayProg.length;
  var ix;
  if (action === 'up' || action === 'down')
  {
	var first = index - 1;
	var last = index - (action === 'up' ? 2 : 0);
	var s = dayProg[first];
	dayProg[first] = dayProg[last];
	dayProg[last] = s;
	if (last < first)
	{
	  first = last;
	}
	for (ix = first; ix < dayProg.length; ix++)
	{
	  fillProgrammazioneBaseDayEntry(ix, dayProg[ix]);
	}
  } else if (action === 'remove')
  {
	dayProg = removeArrayEntry(dayProg, index - 1);
	prog.dayProgramming[datiProgrammazione.currentDay].prog = dayProg;
	for (ix = index - 1; ix < dayProg.length; ix++)
	{
	  fillProgrammazioneBaseDayEntry(ix, dayProg[ix]);
	}

  } else if (action === 'add')
  {
	var entry = {
	  timeStart : 0,
	  timeEnd : 23 * 60 + 59,
	  minTemp : prog.minTemp,
	  priorityDisp : 0
	};
	dayProg.push(entry);
	ix = dayProg.length - 1;
	fillProgrammazioneBaseDayEntry(ix, dayProg[ix]);
  } else if (action === 'showall')
  {
	// lastIx = dayProg.length;
	for (var i = 0; i < MAX_PROGDAY; i++)
	{
	  ix = i + 1;
	  if (i < lastIx)
	  {
		$('#g1' + ix).show();
		$('#g2' + ix).show();
		$('#g3' + ix).show();
		$('#g4' + ix).show();
		$('#tempRange' + ix).attr("required", true);
		$('#time-start' + ix).attr("required", true);
		$('#time-end' + ix).attr("required", true);
		$('#remove' + ix).show();
		$('#add' + ix).show();
		$('#up' + ix).show();
		$('#down' + ix).show();
		$('#add' + ix).prop("disabled", true);
		$('#up' + ix).prop("disabled", true);
		$('#down' + ix).prop("disabled", true);
		if (i === (lastIx - 1))
		{
		  // last
		  if (i === 0)
		  {
			// only one record
			$('#add' + ix).prop("disabled", false);
		  } else
		  {
			// middles
			$('#down' + i).prop("disabled", false);
			$('#up' + ix).prop("disabled", false);
			if (lastIx < MAX_PROGDAY)
			  $('#add' + ix).prop("disabled", false);
		  }
		} else if (i > 0)
		{
		  // middle
		  $('#up' + ix).prop("disabled", false);
		  $('#down' + i).prop("disabled", false);
		} else
		{
		  // first but not last
		  $('#down' + ix).prop("disabled", false);
		}
	  } else
	  {
		$('#g1' + ix).hide();
		$('#g2' + ix).hide();
		$('#g3' + ix).hide();
		$('#g4' + ix).hide();
		$('#tempRange' + ix).attr("required", false);
		$('#time-start' + ix).attr("required", false);
		$('#time-end' + ix).attr("required", false);
		$('#remove' + ix).hide();
		$('#add' + ix).hide();
		$('#up' + ix).hide();
		$('#down' + ix).hide();
	  }
	}
	if (lastIx == 0)
	{
	  $('#add1').show().prop("disabled", false);
	  // $('#add1')
	}
  }
}

function displayDayStatistics(data, param)
{
  // upadet hidden key for reuse
  $('#key').val(data.$loki);
  displayMonitorHighChart(data);
}

function updateDatiProgrammazioneJSON(datiProgrammazione)
{
  datiProgrammazione.anyChange = true;
  var t = JSON.stringify(datiProgrammazione.data);
  $('#saveBtn').prop("disabled", false);
  $('#reloadBtn').prop("disabled", false);
  $('#dati').val(t);
}

function fillProgrammazioneBaseDayPriority(key, ix)
{
  $(key).find('option').remove().end();
  var selected = "";
  var s;
  for (var i = 0; i <= datiDisposistivi.disp.length; i++)
  {
	if (ix === i)
	  selected = " selected ";
	else
	  selected = "";
	if (i == 0)
	  s = '<option value="0"' + selected + '>Default</option>';
	else
	  s = '<option value="' + datiDisposistivi.disp[i - 1].key + '"' + selected + '>' + datiDisposistivi.disp[i - 1].value + '</option>';
	$(key).append(s);
  }
}

function splitTime(t)
{
  var out = [];
  out.push(t / 60);
  out.push(t % 60);
  return out;
}

/**
 * Gestisce pulsanti per programmazione attiva
 * 
 * @param datiProgrammazione
 * @returns
 */
function manageProgrammazioneAttiva(datiProgrammazione)
{
  $('#deleteProgrammingBtn').prop("disabled", true);
  $('#setActiveProgrammingBtn').prop("disabled", true);
  $('#reloadBtn').prop("disabled", !datiProgrammazione.anyChange);
  $('#saveBtn').prop("disabled", !datiProgrammazione.anyChange);

  //$('#tempActiveOn').hide();
  //$('#tempActiveOff').hide();
  if (datiProgrammazione.data.programming.length > 1)
  {
	if (datiProgrammazione.currentProgram === datiProgrammazione.data.activeProg)
	{
	  $('#setActiveProgrammingBtn').prop("disabled", true);
	} else
	{
	  $('#setActiveProgrammingBtn').prop("disabled", false);
	  $('#deleteProgrammingBtn').prop("disabled", false);
	}
  }
}

function fillProgrammazioneBaseDayEntry(i, row)
{
  var ix = i + 1;
  $("#tempRange" + ix).slider('setValue', row.minTemp);
  var start = splitTime(row.timeStart);
  var startM = moment({
	hour : start[0],
	minute : start[1]
  });
  $("#time-start" + ix).bootstrapMaterialDatePicker('setDate', startM);
  // $("#time-start" + ix).val(startM);
  var end = splitTime(row.timeEnd);
  $('#time-end' + ix).bootstrapMaterialDatePicker('setMinDate', startM);
  $("#time-end" + ix).bootstrapMaterialDatePicker('setDate', moment({
	hour : end[0],
	minute : end[1]
  }));
  fillProgrammazioneBaseDayPriority('#termDisp' + ix, row.priorityDisp);
}

function fillProgrammazioneBaseDay(datiProgrammazione)
{
  var entry = datiProgrammazione.data.programming[datiProgrammazione.currentProgram];
  for (var i = 0; i < entry.dayProgramming.length; i++)
  {
	if (entry.dayProgramming[i].idDay === datiProgrammazione.currentDay)
	{
	  var datProg = entry.dayProgramming[i];
	  var day = datProg.idDay;
	  for (var j = 0; j < datProg.prog.length; j++)
	  {
		fillProgrammazioneBaseDayEntry(j, datProg.prog[j]);
	  }
	}
  }
  manageProgData('showall', datiProgrammazione);
}

function fillProgrammazioneBase(datiProgrammazione)
{
  var options = datiProgrammazione.data;
  // programmazione default
  $('#lastUpdate').text(moment(options.lastUpdate).format('DD/MM/YYYY HH:mm'));

  //$("#tempRange").slider('setValue', options.minTemp);
  //if (!options.minTempManual) options.minTempManual = options.minTemp;
  //$("#tempRangeManual").slider('setValue', options.minTempManual);
  // programmazione specifico idProg
  var entry = options.programming[datiProgrammazione.currentProgram];

  $("#tempRange").slider('setValue', entry.minTemp);
  $("#tempRangeManual").slider('setValue', entry.minTempManual);
  $("#nome").val(entry.name);
  $("#progName").text(entry.name);
  if (options.programming.length > 1)
  {
	$('#programmingList').show();
	$('#datiGiorno').collapse({
	  'toggle' : false
	}).collapse('hide');
	$('#programmingList').find('option').remove().end();
	var selected;
	for (var i = 0; i < options.programming.length; i++)
	{
	  entry = options.programming[i];
	  if (datiProgrammazione.currentProgram === entry.idProg)
		selected = 'selected';
	  else
		selected = '';
	  if (entry.idProg === datiProgrammazione.data.activeProg)
		selected = selected + ' style="color:green"';
	  var s = '<option value="' + entry.idProg + '"' + selected + '>' + entry.name + '</option>';
	  $('#select-ProgId').append(s);
	}

  } else
  {
	$('#programmingList').hide();
  }
  manageProgrammazioneAttiva(datiProgrammazione);
}

function fillProgrammazione(data, options)
{
  options.data = data;
  options.currentProgram = data.activeProg;
  fillProgrammazioneBase(options);
}

function fillDispositivi(data, options)
{
  var l = [];
  if (data.length === 0)
  {
	l.push({
	  key : 0,
	  value : 'Default'
	});

  } else
  {
	for (var i = 0; i < data.length; i++)
	{
	  var d = data[i];
	  l.push({
		key : d.$loki,
		value : d.location
	  });
	  var s = '<option value="' + d.$loki + '">' + d.location + '</option>';
	  for (var ix = 0; ix < MAX_PROGDAY; ix++)
	  {
		$('termDisp' + ix).append(s);
	  }

	}

  }
  options.disp = l;
}

function fillConfigurationForm(data, param)
{
  $('#macAddress').text(data.macAddress);
  $('#ipAddress').text(data.ipAddress);
  $('#location').val(data.location);
  $('#lastAccess').text(moment(data.lastAccess).format('DD/MM/YYYY HH:mm'));
  $('#lastUpdate').text(moment(data.lastUpdate).format('DD/MM/YYYY HH:mm'));
  $('#lastCheck').text(moment(data.lastCheck).format('DD/MM/YYYY HH:mm'));

  $('#flagLcd').prop('checked', data.flagLcd === 1);
  $('#flagLightSensor').prop('checked', data.flagLightSensor === 1);
  $('#flagMotionSensor').prop('checked', data.flagMotionSensor === 1);
  $('#flagReleTemp').prop('checked', data.flagReleTemp === 1);
  $('#flagReleLight').prop('checked', data.flagReleLight === 1);
  $('#key').val(data.$loki);
  if (data.flagReleTemp && data.flagReleTemp === 1)
  {
	$('#tipoMisurazione').show();
	$("#measureType").val(data.tempMeasure).change();
	$('#tipoModalita').show();
	$("#status").val(data.status).change();
  } else
  {
	$('#tipoMisurazione').hide();
	$('#tipoModalita').hide();
  }
  if (data.flagReleLight && data.flagReleLight === 1)
  {
	$('#tipoModalitaLuce').show();
	$("#statusLight").val(data.statusLight).change();
  } else
  {
	$('#tipoModalitaLuce').hide();
  }

  $('#ConfigurationData').collapse('show');
}

function fillConfiguration(data, options)
{
  var selectId = options.parameter;
  var desopt = "Seleziona un elemento";
  if (data.length === 0)
  {
	desopt = "Nessuna configurazione trovata";
	// $('#elencoDispositivi').attr("hidden", "true")
	$('#noDispositivi').show();
  } else
  {
	if (data.length === 1)
	{
	  // leggi da parametro
	  if (options.callbackOne)
	  {
		options.callbackOne(data[0], options);
	  }
	} else
	{
	  $(selectId).append('<option value = "-1" selected>' + desopt + '</option>');
	  for (var i = 0; i < data.length; i++)
	  {
		var d = data[i];
		$(selectId).append('<option value="' + d.$loki + '">' + d.macAddress + ' - ' + d.location + "</option>'");
	  }
	  $('#elencoDispositivi').show();
	}
  }
}

function addTemperatureProgramming(options)
{
  var baseUrl = "./rest/addProgramming?type=temp";
  $.ajax({
	type : "GET",
	url : baseUrl,
	// contentType : "application/json; charset=utf-8",
	dataType : "json",
	success : function(data, status, jqXHR)
	{
	  if (data.error.code === 0)
	  {
		options.callback(data.data, options);

	  } else
	  {
		alert("Risposta Server : " + data.error.code + " - Message " + data.error.message);
	  }
	},
	error : function(jqXHR, status)
	{
	  alert("Errore risposta server");
	}
  });

}

function getConfiguration(options)
{
  var baseUrl = "./rest/readDB?coll=conf";
  if (options.key)
	baseUrl = baseUrl + "&key=" + parseInt(options.key);
  $.ajax({
	type : "GET",
	url : baseUrl,
	// contentType : "application/json; charset=utf-8",
	dataType : "json",
	success : function(data, status, jqXHR)
	{
	  if (data.error.code === 0)
	  {
		options.callback(data.data, options);

	  } else
	  {
		alert("Risposta Server : " + data.error.code + " - Message " + data.error.message);
	  }

	},
	error : function(jqXHR, status)
	{
	  alert("Errore risposta server");
	}
  });
}

function getTempProgramming(options)
{
  var baseUrl = "./rest/getProgramming?type=temp&prog=all";
  $.ajax({
	type : "GET",
	url : baseUrl,
	// contentType : "application/json; charset=utf-8",
	dataType : "json",
	success : function(data, status, jqXHR)
	{
	  if (data.error.code === 0)
	  {
		options.callback(data.data, options);
	  } else
	  {
		alert("Risposta Server : " + data.error.code + " - Message " + data.error.message);
	  }
	},
	error : function(jqXHR, status)
	{
	  alert("Errore risposta server");
	}
  });
}
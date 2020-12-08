var httpUtils = require("../../Common/httpUtils");
var thermManager = require("./thermManager");

/**
 * Send JSON response
 */
var genericHTTPPostService = function (options) {
  if (options.httpResponse) {
    let res = options.httpResponse;
    if (options.error) {
      let errorCode = 500;
      if (options.errorCode != "undefined") errorCode = options.errorCode;
      res.json(httpUtils.createResponseKo(errorCode, options.error));
    } else {
      if (options.response) res.json(httpUtils.createResponse(options.response));
      else res.json(httpUtils.createResponse(null, 100, "Record not Found"));
    }
  }
};

/**
 * Generic activity to validate and manage GET request
 */
var validateGetRequest = function (httpRequest, httpResponse) {
  var options = {
    httpRequest: httpRequest,
    httpResponse: httpResponse,
    usePromise: false,
    callback: [],
  };
  return options;
};

/**
 * Generic activity to validate and manage POST request
 */
var validatePostRequest = function (httpRequest, httpResponse) {
  var options = validateGetRequest(httpRequest, httpResponse);
  try {
    // check request encode
    var contype = httpRequest.headers["content-type"];
    console.log("Request ContentType : " + contype);
    if (!contype || contype.indexOf("application/json") >= 0) options.request = httpRequest.body;
    else options.request = httpRequest.body.data;
  } catch (error) {
    httpResponse.json(httpUtils.createResponseKo(500, error));
  }
  return options;
};

const service = {
  checkThermostatStatus: 4,
  updateTemperatureReleStatus: 5,
  shellyRegister: 6,
  monitorSensorData: 7,
  updateConfigurationGUI: 8,
};

let proxyPromise = function (fn, httpRequest, httpResponse) {
  // if (httpRequest.method === "GET")
  // console.log("GET..");
  var options =
    httpRequest.method === "POST"
      ? validatePostRequest(httpRequest, httpResponse)
      : validateGetRequest(httpRequest, httpResponse);
  if (options != null) {
    options.usePromise = true;
    new Promise(function (resolve, reject) {
      switch (fn) {
        case service.checkThermostatStatus:
          thermManager.checkThermostatStatus(options, resolve, reject);
          break;
        case service.updateTemperatureReleStatus:
          thermManager.updateTemperatureReleStatus(options, resolve, reject);
          break;
        case service.shellyRegister:
          thermManager.shellyRegister(options, resolve, reject);
          break;
        case service.monitorSensorData:
          thermManager.monitorSensorData(options, resolve, reject);
          break;
        case service.updateConfigurationGUI:
          thermManager.updateConfigurationGUI(options, resolve, reject);
          break;
      }
    })
      .then(function (options) {
        genericHTTPPostService(options);
      })
      .catch(function (error) {
        httpResponse.json(httpUtils.createResponseKo(500, error));
      });
  }
};

exports.monitorSensorData = function (httpRequest, httpResponse) {
  proxyPromise(service.monitorSensorData, httpRequest, httpResponse);
};

exports.checkThermostatStatus = function (httpRequest, httpResponse) {
  proxyPromise(service.checkThermostatStatus, httpRequest, httpResponse);
};

exports.updateTemperatureReleStatus = function (httpRequest, httpResponse) {
  proxyPromise(service.updateTemperatureReleStatus, httpRequest, httpResponse);
};

exports.shellyRegister = function (httpRequest, httpResponse) {
  proxyPromise(service.shellyRegister, httpRequest, httpResponse);
};
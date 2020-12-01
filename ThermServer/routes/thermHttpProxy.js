var httpManager = require("../../Common/serverHTTPManager");
var termManagment = require("./thermServerHTTP");

/**
 * List of implemented http function
 */
const serviceMap = {
  getSensorData: termManagment.getSensorData,
  getReleData: termManagment.getReleData,
};

/**
 * generic class for http request managment
 * @param {*} httpRequest
 * @param {*} httpResponse
 */
let thermHttpProxy = function (httpRequest, httpResponse) {
  httpManager.proxyManager(httpRequest, httpResponse, serviceMap);
};

exports.thermHttpProxy = thermHttpProxy;

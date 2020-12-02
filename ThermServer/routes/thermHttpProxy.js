var httpManager = require("../../Common/serverHTTPManager");
var thermManager = require("./thermManager");

/**
 * List of implemented http function
 */
const serviceMap = {
  getSensorData: thermManager.getSensorData,
  getReleData: thermManager.getReleData,
  updateStatus: thermManager.updateStatus,
  getConfiguration: thermManager.updateStatus,
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

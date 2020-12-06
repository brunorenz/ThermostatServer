var httpManager = require("../../Common/serverHTTPManager");
var thermManager = require("./thermManager");
var thermHttpWrapper = require("./thermHttpWrapper");

/**
 * List of implemented http function
 */
const serviceMap = {
  getSensorData: thermManager.getSensorData,
  getReleData: thermManager.getReleData,
  updateStatus: thermManager.updateStatus,
  getDeviceConfiguration: thermManager.getDeviceConfiguration,
  updateDeviceConfiguration: thermManager.updateDeviceConfiguration,
  getProgramming: thermHttpWrapper.getProgramming,
  addProgramming: thermHttpWrapper.addProgramming,
  updateProgramming: thermHttpWrapper.updateProgramming,
  deleteProgramming: thermHttpWrapper.deleteProgramming,
  getReleStatistics: thermHttpWrapper.getReleStatistics,
  getSensorStatistics: thermHttpWrapper.getSensorStatistics,
};

/**
 * generic class for http request managment
 * @param {*} httpRequest
 * @param {*} httpResponse
 */
let thermHttpProxy = function (httpRequest, httpResponse) {
  httpManager.proxyManager(httpRequest, httpResponse, serviceMap);
};

let thermHttpProxyNoSecurity = function (httpRequest, httpResponse) {
  httpManager.proxyManager(httpRequest, httpResponse, serviceMap,true);
};

exports.thermHttpProxy = thermHttpProxy;
exports.thermHttpProxyNoSecurity = thermHttpProxyNoSecurity;

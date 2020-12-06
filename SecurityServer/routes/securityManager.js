var httpManager = require("../../Common/serverHTTPManager");
var httpSecurityManager = require("./httpSecurityManager");
var configuration = require("./configuration");

var mongoSec = null;

let logout = function (options, resolve, reject) {
  httpSecurityManager.cleanJwt(options.httpRequest);
  resolve(options);
}

let readUser = function (options, resolve, reject) {
  let user = options.request;
  //let token = "KO";
  console.log("USER " + typeof user);
  console.log("EMAIL " + typeof user.email);
  if (typeof user != "undefined" && typeof user.email != "undefined") {
    let pwd = user.passwordMd5 === undefined ? user.password : user.passwordMd5.toUpperCase();
    if (user.email === "65bruno@gmail.com" && pwd === "0C88028BF3AA6A6A143ED846F2BE1EA4") {
      let userOut = {
        email: user.email,
        name: "Bruno",
      };
      if (typeof user.application != "undefined") {
        if (user.application === "MyBank") userOut.uniqueId = "CXY0";
        else if (user.application === "MyDomotic") userOut.uniqueId = "CXY1";
        else if (user.application === "Therm") userOut.uniqueId = "CXY2";
      }
      httpSecurityManager.setJwt(options.httpRequest,"user", userOut);
      options.response = userOut;
    } else {
      options.errorCode = 200;
      options.error = "Utente o Password errati!";
    }
    //options.httpRequest.jwttoken = token;
  }
  resolve(options);
};
/**
 * List of implemented http function
 */
const serviceMap = {
  login: readUser,
  logout
};

/**
 * generic class for http request managment
 * @param {*} httpRequest
 * @param {*} httpResponse
 */
let securityHttpProxy = function (httpRequest, httpResponse) {
  httpManager.proxyManager(httpRequest, httpResponse, serviceMap);
};


let initConfigurationServer = function (connection) {
  configuration.mongoConSec = connection.db(configuration.DBNameSec);
  console.log("Created connection for DB  : " + configuration.mongoConSec.databaseName);
};


exports.securityHttpProxy = securityHttpProxy;
exports.initConfigurationServer = initConfigurationServer;

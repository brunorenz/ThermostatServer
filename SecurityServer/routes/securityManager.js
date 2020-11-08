var httpManager = require("./common/serverHTTPManager");
var httpSecurityManager = require("./common/httpSecurityManager");

var mongoSec = null;

let readUser = function (options, resolve, reject) {
  let user = JSON.parse(options.request);
  console.log("USER " + typeof user);
  console.log("EMAIL " + typeof user.email);
  // 0C88028BF3AA6A6A143ED846F2BE1EA4
  if (typeof user != "undefined" && typeof user.email != "undefined") {
    if (user.email === "65bruno@gmail.com" && user.password === "pippo") {
      let userOut = {
        email: user.email,
        name: "Bruno",
      };
      if (typeof user.application != "undefined") {
        if (user.application === "MyBank") userOut.uniqueId = "CXY0";
        else if (user.application === "Therm") userOut.uniqueId = "CXY1";
      }
      let token = httpSecurityManager.sign(userOut);
      options.httpRequest.jwttoken = token;
      //userOut.token = token;
      options.response = userOut;
    } else {
      options.errorCode = 200;
      options.error = "Utente o Password errati!";
    }
  }
  resolve(options);
};

let readUser2 = function (options, resolve, reject) {
  let user = options.request;
  let token = "KO";
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
        else if (user.application === "Therm") userOut.uniqueId = "CXY1";
      }
      token = httpSecurityManager.sign(userOut);
      options.response = userOut;
    } else {
      options.errorCode = 200;
      options.error = "Utente o Password errati!";
    }
    options.httpRequest.jwttoken = token;
  }
  resolve(options);
};
/**
 * List of implemented http function
 */
const serviceMap = {
  login: readUser2,
};

/**
 * generic class for http request managment
 * @param {*} httpRequest
 * @param {*} httpResponse
 */
let securityHttpProxy = function (httpRequest, httpResponse) {
  httpManager.proxyManager(httpRequest, httpResponse, serviceMap);
};
exports.securityHttpProxy = securityHttpProxy;

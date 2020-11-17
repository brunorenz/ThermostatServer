var httpUtils = require("./httpUtils");

/**
 * Send JSON response
 */
var genericHTTPPostService = function (options) {
  if (options.httpResponse) {
    let res = options.httpResponse;
    let req = options.httpRequest;
    if (req.jwttoken != undefined) {
      let t = "jwttoken=" + req.jwttoken + "; Path=/; HttpOnly";
      res.append("Set-Cookie", t);
    }
    if (options.error) {
      let errorCode = 500;
      if (options.errorCode != "undefined") errorCode = options.errorCode;
      res.json(httpUtils.createResponseKo(errorCode, options.error));
    } else {
      if (typeof options.responseWarning != "undefined" && options.responseWarning != null) {
        res.json(httpUtils.createResponse(null, 100, options.responseWarning));
      } else if (options.response) {
        res.json(httpUtils.createResponse(options.response));
      } else res.json(httpUtils.createResponse(null, 100, "Record not Found"));
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
    request: httpRequest.query,
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
    if (!contype || contype.indexOf("application/json") >= 0) {
      options.request = httpRequest.body;
      console.log("POST Request : " + JSON.stringify(options.request));
    } else options.request = httpRequest.body.data;
  } catch (error) {
    httpResponse.json(httpUtils.createResponseKo(500, error));
  }
  return options;
};

/**
 * Proxy for HTTP funcion
 * @param {*} fn
 * @param {*} httpRequest
 * @param {*} httpResponse
 */
let proxyPromise = function (fn, httpRequest, httpResponse) {
  var options =
    httpRequest.method === "POST"
      ? validatePostRequest(httpRequest, httpResponse)
      : validateGetRequest(httpRequest, httpResponse);
  if (options != null) {
    processJWTToken(options);
    new Promise(function (resolve, reject) {
      fn(options, resolve, reject);
    })
      .then(function (options) {
        genericHTTPPostService(options);
      })
      .catch(function (error) {
        httpResponse.json(httpUtils.createResponseKo(500, error));
      });
  }
};

let processJWTToken = function (options) {
  // recupera jwtToken
  if (options.httpRequest.cookies) {
    let key = Object.keys(options.httpRequest.cookies);
    //  + ("; Path=/; HttpOnly");
    if (key != undefined)
      for (let ix = 0; ix < key.length; ix++) {
        if (key[ix] === "jwttoken") options.jwttoken = options.httpRequest.cookies[key[ix]];
        //else c.push(key[ix] + "=" + options.httpRequest.cookies[key[ix]]);
      }
  }
};

/**
 * generic class for http request managment
 * @param {*} httpRequest
 * @param {*} httpResponse
 */
let proxyManager = function (httpRequest, httpResponse, serviceMap) {
  let functionName = httpUtils.getFunctionFromUrl(httpRequest.url);
  console.log("ProxyHTTPRequestManager " + httpRequest.url + " --> " + functionName);
  let fn = serviceMap[functionName];
  if (fn != undefined) proxyPromise(fn, httpRequest, httpResponse);
  else httpResponse.json(httpUtils.createResponseKo(500, "service " + functionName + " is not implemented"));
};
exports.proxyManager = proxyManager;

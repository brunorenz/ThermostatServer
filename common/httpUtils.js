var http = require("http");
var webSocket = require("ws");
var globaljs = require("../global");

var httpPostJSON = function (options, postData, mycallback, param) {
  var headers = {
    "Content-Type": "application/json",
  };

  options.headers = headers;
  options.method = "POST";

  var req = http.request(options, function (res) {
    console.log("STATUS: " + res.statusCode);
    console.log("HEADERS: " + JSON.stringify(res.headers));
    res.setEncoding("utf8");
    var body = "";
    res.on("data", function (d) {
      body += d;
    });
    res.on("end", function () {
      var parsed = JSON.parse(body);

      if (mycallback && typeof mycallback === "function") {
        if (param) {
          mycallback(parsed, param);
        } else {
          mycallback(parsed);
        }
      } else {
        console.log("RESPONSE: " + body);
      }
    });
  });

  req.on("error", function (err) {
    console.log(err);
  });
  req.write(JSON.stringify(postData));
  req.end();
};

var httpGetJSON = function (options, mycallback, param) {
  var headers = {
    "Content-Type": "application/json",
  };

  options.headers = headers;
  options.method = "GET";

  var req = http.get(options, function (res) {
    console.log("STATUS: " + res.statusCode);
    console.log("HEADERS: " + JSON.stringify(res.headers));
    res.setEncoding("utf8");
    var body = "";
    res.on("data", function (d) {
      body += d;
    });
    res.on("end", function () {
      var parsed = JSON.parse(body);

      if (mycallback && typeof mycallback === "function") {
        if (param) {
          mycallback(parsed, param);
        } else {
          mycallback(parsed);
        }
      } else {
        console.log("RESPONSE: " + body);
      }
    });
  });

  req.on("error", function (err) {
    console.log(err);
  });
};

var webSocketSendEvent = function (event) {
  var map = globaljs.WSS;
  if (map) {
    map.forEach(function f(entry) {
      var ws = entry.value.ws;
      console.log("CLIENT " + entry.key + " STATE : " + ws.readyState);
      if (ws.readyState === webSocket.OPEN) {
        console.log("Send EVENT " + event);
        ws.send(event);
      } else {
        console.log("Pospone EVENT " + event);
        entry.value.command = event;
        mapPut(map, entry.key, entry.value);
      }
    });
  }
};

var webSocketConnection = function (ws, req) {
  var s = globaljs.WSS;
  if (!s) {
    s = [];
    globaljs.WSS = s;
  }

  var ip = req.connection.remoteAddress;
  var entry = mapGet(s, ip);
  if (!entry) {
    console.log("WEBSOCKET (ADD) connection from client ip " + ip);
    entry = {
      ws: ws,
      command: null,
    };
    mapPut(s, ip, entry);
  } else {
    console.log("WEBSOCKET (UPDATE) connection from client ip " + ip);
    entry.ws = ws;
    if (entry.command && entry.command !== null) {
      ws.send(entry.command);
      entry.command = null;
    }
    mapPut(s, ip, entry);
  }

  console.log("WEBSOCKET connection from client ip " + ip);
};

/**
 * Create errore response code
 * @param {*} errorCode
 * @param {*} message
 */
var createResponseKo = function (errorCode, error) {
  let message = error;
  if (error instanceof Error) {
    message = error.name + " : " + error.message;
  }
  return createResponse(null, errorCode, message);
};
/**
 * Create generic response
 */
var createResponse = function (object, errorCode, message) {
  if (!errorCode) {
    errorCode = 0;
    message = "OK";
  }
  var error = {
    code: errorCode,
    message: message,
  };
  var response = {
    error: error,
  };
  if (object !== null) {
    response.data = object;
  }
  return response;
};

let getFunctionFromUrl = function (url) {
  let functionName = url;
  var n = functionName.lastIndexOf("/");
  if (n >= 0) functionName = functionName.substring(n + 1);
  n = functionName.indexOf("?");
  if (n >= 0) functionName = functionName.substring(0, n);
  return functionName;
};

module.exports.createResponse = createResponse;
module.exports.createResponseKo = createResponseKo;
module.exports.webSocketSendEvent = webSocketSendEvent;
module.exports.webSocketConnection = webSocketConnection;
module.exports.httpGetJSON = httpGetJSON;
module.exports.httpPostJSON = httpPostJSON;
module.exports.getFunctionFromUrl = getFunctionFromUrl;

const configuration = require("./configuration");
const jwt = require("jsonwebtoken");

/**
 * Check basic authentication from http header
 */
let validateBasicAuthentication = function (req, res) {
  let basicConf = configuration.Security;
  var rc = true;
  if ((req.method === "GET" || req.method === "POST") && basicConf.basicAuthRequired) {
    if (!req.headers.authorization) {
      res.status(401).send("missing authorization header").end();
      rc = false;
    } else if (req.headers.authorization !== basicConf.basicAuth) {
      res.status(403).end("not authorized");
      rc = false;
    }
  }
  return rc;
};

/**
 * Check basic authentication from http header
 */
let validateJWTSecurity = function (req, res) {
  var rc = true;
  if (req.path.endsWith("login")) return true;
  let jwtConf = configuration.Security.jwt;
  if (jwtConf.enabled) {
    let jwttoken = undefined;
    if (req.cookies != undefined && req.cookies.jwttoken) jwttoken = req.cookies.jwttoken;
    else if (req.headers != undefined && req.headers.jwttoken) jwttoken = req.headers.jwttoken;
    if (jwttoken === undefined) {
      res.status(401).send("Missing jwt token").end();
      rc = false;
    } else {
      let jwtData = decrypt(jwttoken);
      if (jwtData === undefined) {
        res.status(403).send("Token expired").end();
        rc = false;
      } else {
        //req.jwttoken = jwttoken;
        req.jwtData = jwtData;
      }
    }
  }
  return rc;
};

let checkBasicSecurity = function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:8080");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, jwttoken");
  res.header("Set-Cookie", "HttpOnly;Secure;SameSite=Strict");
  if (req.method === "GET" || req.method === "POST") {
    if (validateBasicAuthentication(req, res) && validateJWTSecurity(req, res)) {
      next();
    } else {
      console.log("Check BASIC Security, JWT and set CORS : Fails!");
    }
  } else next();
};

let encrypt = function (obj) {
  let jwtConf = configuration.Security.jwt;
  delete obj["exp"];
  delete obj["iat"];
  let token = jwt.sign(obj, jwtConf.secret, {
    expiresIn: jwtConf.expire,
  });
  return token;
};

let decrypt = function (token) {
  let jwtConf = configuration.Security.jwt;
  let obj = undefined;
  try {
    obj = jwt.verify(token, jwtConf.secret);
  } catch (error) {
    console.log("JWT KO for token " + token + " : " + error);
  }
  return obj;
};

let cleanJwt = function (req) {
  if (req.jwtData != undefined)
    delete req["jwtData"];
}
let setJwt = function (req, key, value) {
  let jwtData = req.jwtData;
  if (jwtData === undefined)
    jwtData = {};
  jwtData[key] = value;
  req.jwtData = jwtData;
}

let getJwt = function (req, key) {
  let jwtData = req.jwtData;
  if (jwtData === undefined)
    jwtData = {};
  return jwtData[key];
}

exports.encrypt = encrypt;
exports.setJwt = setJwt;
exports.getJwt = getJwt;
exports.cleanJwt = cleanJwt;
exports.checkBasicSecurity = checkBasicSecurity;
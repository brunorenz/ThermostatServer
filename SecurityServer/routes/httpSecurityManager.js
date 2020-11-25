const globaljs = require("../../ThermServer/routes/global");
const jwt = require("jsonwebtoken");

let getUserRecord = function () {
  let u = {
    email: "",
    password: "",
    name: "",
  };
  return u;
};

let sign = function (user) {
  let token = jwt.sign(user, globaljs.JWT.secret, {
    expiresIn: globaljs.JWT.expire,
  });
  return token;
};

let verifyToken = function (token) {
  try {
    let user = jwt.verify(token, globaljs.JWT.secret);
    console.log("JWT OK for " + user.email);
  } catch (error) {
    console.log("JWT KO for token " + token + " : " + error);
    return false;
  }
  return true;
};

// //exports.verifyToken = verify;

// exports.readUser = function (options, resolve, reject) {
//   // mongodb
//   let user = JSON.parse(options.request);
//   console.log("USER " + typeof user);
//   console.log("EMAIL " + typeof user.email);
//   if (typeof user != "undefined" && typeof user.email != "undefined") {
//     if (user.email === "65bruno@gmail.com" && user.password === "pippo") {
//       let userOut = {
//         email: user.email,
//         name: "Bruno",
//       };
//       let token = sign(userOut);
//       userOut.token = token;
//       options.response = userOut;
//     } else {
//       options.errorCode = 200;
//       options.error = "Utente o Password errati!";
//     }
//   }
//   resolve(options);
// };

/**
 * Check basic authentication from http header
 */
var validateBasicAuthentication = function (req, res) {
  var rc = true;
  if ((req.method === "GET" || req.method === "POST") && globaljs.BASIC_AUTH_REQUIRED) {
    if (!req.headers.authorization) {
      res.status(401).send("missing authorization header").end();
      rc = false;
    } else if (req.headers.authorization !== globaljs.BASIC_AUTH) {
      res.status(401).end();
      rc = false;
    }
  }
  return rc;
};

/**
 * Check basic authentication from http header
 */
var validateJWTSecurity = function (req, res) {
  var rc = true;
  if (req.path.endsWith("login")) return true;
  if (
    globaljs.JWT.enabled &&
    ((globaljs.JWT.securityGET && req.method === "GET") || (globaljs.JWT.securityPOST && req.method === "POST"))
  ) {
    let jwttoken = undefined;
    if (req.cookies != undefined && req.cookies.jwttoken) jwttoken = req.cookies.jwttoken;
    else if (req.headers != undefined && req.headers.jwttoken) jwttoken = req.headers.jwttoken;
    if (jwttoken === undefined) {
      res.status(401).send("missing jwt token header").end();
      rc = false;
    } else {
      let ok = verifyToken(jwttoken);
      if (!ok) {
        res.status(403).send("Token expired").end();
        rc = false;
      } else req.jwttoken = jwttoken;
    }
  }
  return rc;
};

// exports.manageJwtToken = function (req, res, next) {
//   if (req.jwttoken != undefined) {
//     res.append("Set-Cookie", req.jwttoken);
//   }
//   next();
// };

exports.checkBasicSecurity = function (req, res, next) {
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

exports.sign = sign;

let encrypt = function (obj) {
  let token = jwt.sign(obj, Constants.JWT.secret);
  return token;
};

let decrypt = function (token) {
  let obj = undefined;
  try {
    obj = jwt.verify(token, Constants.JWT.secret);
  } catch (error) {
    console.log("JWT KO for token " + token + " : " + error);
  }
  return obj;
};

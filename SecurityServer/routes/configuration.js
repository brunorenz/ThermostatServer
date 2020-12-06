// fast security check
let jwtEnable = true;
let basicAuthEnable = true;
// Security DB
var DBNameSec = "SecurityDB";
var mongoConSec;

exports.DBNameSec = DBNameSec;
exports.mongoConSec = mongoConSec;


let JWT = {
    enabled: jwtEnable,
    secret: "Piripiccio2020!",
    expire: "24h",
  };
  
  var basicAuth = "Basic YWRtaW46YWgwNjB2eUEu";
  var basicAuthRequired = true;

  exports.Security = {
    basicAuthRequired : basicAuthEnable,
    basicAuth,
    jwt : JWT
  };
  
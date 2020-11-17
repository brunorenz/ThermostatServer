const origlog = console.log;

const getCurrentDateFormat = function () {
  //var dateStr = new Date().toLocaleString(); // default date format
  let dateStr = new Date().toLocaleString();
  return dateStr + " ";
};

log = function (obj, ...argumentArray) {
  var datePrefix = getCurrentDateFormat() + " : ";
  if (typeof obj === "string") {
    argumentArray.unshift(datePrefix + obj);
  } else {
    // This handles console.log( object )
    argumentArray.unshift(obj);
    argumentArray.unshift(datePrefix);
  }
  origlog.apply(this, argumentArray);
};

module.exports.log = log;

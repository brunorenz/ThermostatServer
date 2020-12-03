/**
 * Execute a generic query
 * @param {*} options
 * @param {*} resolve
 * @param {*} reject
 */
let genericQuery = function (options, resolve, reject) {
  let qf = function (err, doc) {
    if (err) {
      console.error("ERRORE esecuzione query " + err);
    } else {
      if (doc) {
        options.response = doc;
      } else options.response = selectOne ? null : [];
    }
    if (err) reject(err);
    else resolve(options);
  };
  let query = options.genericQuery;
  let confColl = query.collection;
  let filter = {};
  let sort = {};
  let limit = 0;
  if (typeof query.filter != "undefined") filter = query.filter;
  if (typeof query.sort != "undefined") sort = query.sort;
  if (typeof query.limit != "undefined") limit = query.limit;
  let selectOne = true;
  if (typeof query.selectOne != "undefined") selectOne = query.selectOne;
  console.log("Execute generic query FILTER : " + JSON.stringify(filter) + " - SORT " + JSON.stringify(sort));
  if (selectOne) confColl.findOne(filter, { sort: sort }, qf);
  else confColl.find(filter, { sort: sort }).limit(limit).toArray(qf);
};

exports.genericQuery = genericQuery;

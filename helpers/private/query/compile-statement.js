const SQLSERVER = require('machinepack-sqlserver-adapter');
module.exports = async function compileStatement(statement, meta, cb) {
  const report = await SQLSERVER.compileStatement({
    statement: statement,
    meta: meta
  }).catch(err => {
    return cb(err);
  });
  return cb(undefined, report);
};

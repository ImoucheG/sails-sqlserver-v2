const SQLSERVER = require('machinepack-sqlserver-adapter');
module.exports = async function compileStatement(statement, meta) {
  const report = await SQLSERVER.compileStatement({
    statement: statement,
    meta: meta
  }).catch(err => {
    return Promise.reject(err);
  });
  return Promise.resolve(report);
};

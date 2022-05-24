const SQLSERVER = require('machinepack-sqlserver-adapter');
module.exports = async function runNativeQuery(reportConnection, manager, query, valuesToEscape, statement, meta, cb) {
  SQLSERVER.sendNativeQuery({
    connection: reportConnection.connection,
    manager: manager,
    statement: statement,
    nativeQuery: query,
    valuesToEscape: valuesToEscape,
    meta: meta
  }).then((report) => {
    return cb(undefined, report.result.rows);
  }).catch(async err => {
    const parsedError = await SQLSERVER.parseNativeQueryError({
      nativeQueryError: err
    }).catch(e => {
      return cb(e);
    });
    return cb(parsedError);
  });
};

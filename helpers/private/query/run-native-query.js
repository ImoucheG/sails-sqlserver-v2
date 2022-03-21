const SQLSERVER = require('machinepack-sqlserver-adapter');
module.exports = async function runNativeQuery(reportConnection, manager, query, valuesToEscape, statement, meta) {
  const report = await SQLSERVER.sendNativeQuery({
    connection: reportConnection.connection,
    manager: manager,
    statement: statement,
    nativeQuery: query,
    valuesToEscape: valuesToEscape,
    meta: meta
  }).catch(async err => {
    if (err.exit === 'error') {
      return Promise.reject(err);
    }
    if (err.exit === 'queryFailed') {
      let parsedError = await SQLSERVER.parseNativeQueryError({
        nativeQueryError: err
      }).catch(e => {
        return Promise.reject(e);
      });
      let catchAllError = false;
      if (parsedError.footprint.identity === 'catchall') {
        catchAllError = true;
      }
      if (catchAllError) {
        return Promise.reject(err);
      }
      if (parsedError.footprint) {
        err.footprint = parsedError;
      }
      return Promise.reject(err);
    }
  });
  const Helpers = require('../../private');
  Helpers.connection.releaseConnection(manager, reportConnection.connection);
  return Promise.resolve(report.result.rows);
};

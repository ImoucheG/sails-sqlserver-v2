//  ██████╗ ██╗   ██╗███╗   ██╗    ███╗   ██╗ █████╗ ████████╗██╗██╗   ██╗███████╗
//  ██╔══██╗██║   ██║████╗  ██║    ████╗  ██║██╔══██╗╚══██╔══╝██║██║   ██║██╔════╝
//  ██████╔╝██║   ██║██╔██╗ ██║    ██╔██╗ ██║███████║   ██║   ██║██║   ██║█████╗
//  ██╔══██╗██║   ██║██║╚██╗██║    ██║╚██╗██║██╔══██║   ██║   ██║╚██╗ ██╔╝██╔══╝
//  ██║  ██║╚██████╔╝██║ ╚████║    ██║ ╚████║██║  ██║   ██║   ██║ ╚████╔╝ ███████╗
//  ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝    ╚═╝  ╚═══╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═══╝  ╚══════╝
//
//   ██████╗ ██╗   ██╗███████╗██████╗ ██╗   ██╗
//  ██╔═══██╗██║   ██║██╔════╝██╔══██╗╚██╗ ██╔╝
//  ██║   ██║██║   ██║█████╗  ██████╔╝ ╚████╔╝
//  ██║▄▄ ██║██║   ██║██╔══╝  ██╔══██╗  ╚██╔╝
//  ╚██████╔╝╚██████╔╝███████╗██║  ██║   ██║
//   ╚══▀▀═╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝   ╚═╝
//
// Run a native SQL query on an open connection and return the raw results.

var _ = require('@sailshq/lodash');
var SQLSERVER = require('machinepack-sqlserver');

module.exports = function runNativeQuery(connection, manager, query, valuesToEscape, meta, cb) {
  SQLSERVER.sendNativeQuery({
    connection: connection,
    manager: manager,
    nativeQuery: query,
    valuesToEscape: valuesToEscape,
    meta: meta
  })
  .switch({
    error: function error(err) {
      return cb(err);
    },

    // If the query failed, try and parse it into a normalized format.
    queryFailed: function queryFailed(report) {
      // Parse the native query error into a normalized format
      var parsedError;
      try {
        parsedError = SQLSERVER.parseNativeQueryError({
          nativeQueryError: report.error
        }).execSync();
      } catch (e) {
        return cb(e);
      }

      // If the catch all error was used, return an error instance instead of
      // the footprint.
      var catchAllError = false;

      if (parsedError.footprint.identity === 'catchall') {
        catchAllError = true;
      }

      if (catchAllError) {
        return cb(report.error);
      }

      // Attach parsed error as footprint on the native query error
      if (!_.has(report.error, 'footprint')) {
        report.error.footprint = parsedError;
      }

      return cb(report.error);
    },
    success: function success(report) {
      return cb(null, report.result.rows);
    }
  });
};

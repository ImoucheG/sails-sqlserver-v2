const _ = require('@sailshq/lodash');
const SQLSERVER = require('machinepack-sqlserver-adapter');
module.exports = async function runQuery(options, manager, cb) {
  if (_.isUndefined(options) || !_.isPlainObject(options)) {
    return cb(new Error('Invalid options argument. Options must contain: connection, nativeQuery, and leased.'));
  }

  if (!_.has(options, 'connection') || !_.isObject(options.connection)) {
    return cb(new Error('Invalid option used in options argument. Missing or invalid connection.'));
  }

  if (!_.has(options, 'nativeQuery')) {
    return cb(new Error('Invalid option used in options argument. Missing or invalid nativeQuery.'));
  }
  const report = await SQLSERVER.sendNativeQuery({
    connection: options.connection,
    manager: manager,
    statement: options.statement,
    nativeQuery: options.nativeQuery,
    valuesToEscape: options.valuesToEscape,
    meta: options.meta
  }).catch(async err => {
    let parsedError;
    parsedError = await SQLSERVER.parseNativeQueryError({
      nativeQueryError: err
    }).catch(async e => {
      if (!options.disconnectOnError) {
        return cb(e);
      }
      return cb(e);
    });
    return cb(parsedError);
  });

  if (options.customPrimaryKey) {
    return cb(undefined, {
      result: {
        inserted: options.customPrimaryKey
      }
    });
  }

  if (report) {
    let queryResults = report.result;
    if (options.queryType) {
      queryResults = await SQLSERVER.parseNativeQueryResult({
        queryType: options.queryType,
        nativeQueryResult: report.result
      }).catch(e => {
        return cb(e);
      });
    }
    return cb(undefined, queryResults);
  } else {
    return cb(new Error('Invalid option used in options argument. Missing or invalid nativeQuery.' + options.nativeQuery));
  }
};

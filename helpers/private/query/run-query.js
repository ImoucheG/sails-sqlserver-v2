const _ = require('@sailshq/lodash');
const SQLSERVER = require('machinepack-sqlserver-adapter');
module.exports = async function runQuery(options, manager) {
  if (_.isUndefined(options) || !_.isPlainObject(options)) {
    return Promise.reject(new Error('Invalid options argument. Options must contain: connection, nativeQuery, and leased.'));
  }

  if (!_.has(options, 'connection') || !_.isObject(options.connection)) {
    return Promise.reject(new Error('Invalid option used in options argument. Missing or invalid connection.'));
  }

  if (!_.has(options, 'nativeQuery')) {
    return Promise.reject(new Error('Invalid option used in options argument. Missing or invalid nativeQuery.'));
  }
  const report = await SQLSERVER.sendNativeQuery({
    connection: options.connection,
    manager: manager,
    statement: options.statement,
    nativeQuery: options.nativeQuery,
    valuesToEscape: options.valuesToEscape,
    meta: options.meta
  }).catch(async err => {
    if (!err.code) {
      if (!options.disconnectOnError) {
        return Promise.reject(err);
      }
    }
    let parsedError;
    if (err.code === 'queryFailed') {
      parsedError = await SQLSERVER.parseNativeQueryError({
        nativeQueryError: err
      }).catch(async e => {
        if (!options.disconnectOnError) {
          return Promise.reject(e);
        }
        return Promise.resolve();
      });
      return Promise.reject(parsedError);
    }
    let catchAllError = false;
    if (!parsedError || parsedError.footprint.identity === 'catchall') {
      catchAllError = true;
    }

    if (!options.disconnectOnError) {
      if (catchAllError) {
        return Promise.reject(report.error);
      }
      return Promise.reject();
    }
  });

  if (options.customPrimaryKey) {
    return Promise.resolve({
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
        return Promise.reject(e);
      });
    }
    return Promise.resolve(queryResults);
  } else {
    return Promise.reject(new Error('Invalid option used in options argument. Missing or invalid nativeQuery.' + options.nativeQuery));
  }
};

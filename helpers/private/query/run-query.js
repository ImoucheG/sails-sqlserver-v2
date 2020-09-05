//  ██████╗ ██╗   ██╗███╗   ██╗     ██████╗ ██╗   ██╗███████╗██████╗ ██╗   ██╗
//  ██╔══██╗██║   ██║████╗  ██║    ██╔═══██╗██║   ██║██╔════╝██╔══██╗╚██╗ ██╔╝
//  ██████╔╝██║   ██║██╔██╗ ██║    ██║   ██║██║   ██║█████╗  ██████╔╝ ╚████╔╝
//  ██╔══██╗██║   ██║██║╚██╗██║    ██║▄▄ ██║██║   ██║██╔══╝  ██╔══██╗  ╚██╔╝
//  ██║  ██║╚██████╔╝██║ ╚████║    ╚██████╔╝╚██████╔╝███████╗██║  ██║   ██║
//  ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝     ╚══▀▀═╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝   ╚═╝
//
// Send a Native Query to the datastore and gracefully handle errors.

const _ = require('@sailshq/lodash');
const SQLSERVER = require('machinepack-sqlserver-adapter');
const releaseConnection = require('../connection/release-connection');

module.exports = async function runQuery(options, manager) {
  //  ╦  ╦╔═╗╦  ╦╔╦╗╔═╗╔╦╗╔═╗  ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
  //  ╚╗╔╝╠═╣║  ║ ║║╠═╣ ║ ║╣   │ │├─┘ │ ││ ││││└─┐
  //   ╚╝ ╩ ╩╩═╝╩═╩╝╩ ╩ ╩ ╚═╝  └─┘┴   ┴ ┴└─┘┘└┘└─┘
  if (_.isUndefined(options) || !_.isPlainObject(options)) {
    return Promise.reject(new Error('Invalid options argument. Options must contain: connection, nativeQuery, and leased.'));
  }

  if (!_.has(options, 'connection') || !_.isObject(options.connection)) {
    return Promise.reject(new Error('Invalid option used in options argument. Missing or invalid connection.'));
  }

  if (!_.has(options, 'nativeQuery')) {
    return Promise.reject(new Error('Invalid option used in options argument. Missing or invalid nativeQuery.'));
  }

  //  ╦═╗╦ ╦╔╗╔  ┌┐┌┌─┐┌┬┐┬┬  ┬┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ╠╦╝║ ║║║║  │││├─┤ │ │└┐┌┘├┤   │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╩╚═╚═╝╝╚╝  ┘└┘┴ ┴ ┴ ┴ └┘ └─┘  └─┘└└─┘└─┘┴└─ ┴
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
      await releaseConnection(options.connection, manager, options.leased).catch(err1 => {
        return Promise.reject(err1);
      });
    }
    // If the query failed, try and parse it into a normalized format and
    // release the connection if needed.
    let parsedError;
    if (err.code === 'queryFailed') {
      // Parse the native query error into a normalized format
      parsedError = await SQLSERVER.parseNativeQueryError({
        nativeQueryError: err.error
      }).catch(async e => {
        if (!options.disconnectOnError) {
          return Promise.reject(e);
        }
        await releaseConnection(options.connection, manager, options.leased);
        return Promise.resolve();
      });
    }
    // If the catch all error was used, return an error instance instead of
    // the footprint.
    var catchAllError = false;

    if (!parsedError || parsedError.footprint.identity === 'catchall') {
      catchAllError = true;
    }

    // If this shouldn't disconnect the connection, just return the normalized
    // error with the footprint.
    if (!options.disconnectOnError) {
      if (catchAllError) {
        return Promise.reject(report.error);
      }
      return Promise.reject(parsedError);
    }
    await releaseConnection(options.connection, manager, false).catch(reportError => {
      if (catchAllError) {
        return Promise.reject(reportError.error);
      }
      return Promise.reject(parsedError);
    });
  });
  // If a custom primary key was used and the record has an `insert` query
  // type, build a manual insert report because we don't have the actual
  // value that was used.
  if (options.customPrimaryKey) {
    return Promise.resolve({
      result: {
        inserted: options.customPrimaryKey
      }
    });
  }


  //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬  ┬─┐┌─┐┌─┐┬ ┬┬ ┌┬┐┌─┐
  //  ╠═╝╠═╣╠╦╝╚═╗║╣   │─┼┐│ │├┤ ├┬┘└┬┘  ├┬┘├┤ └─┐│ ││  │ └─┐
  //  ╩  ╩ ╩╩╚═╚═╝╚═╝  └─┘└└─┘└─┘┴└─ ┴   ┴└─└─┘└─┘└─┘┴─┘┴ └─┘
  // If there was a query type given, parse the results.
  if(report) {
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

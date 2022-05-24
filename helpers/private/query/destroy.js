const _ = require('@sailshq/lodash');
const runQuery = require('./run-query');
const compileStatement = require('./compile-statement');
const getColumns = require('./get-columns');


module.exports = async function insertRecord(options, manager, cb) {
  if (_.isUndefined(options) || !_.isPlainObject(options)) {
    return cb(new Error('Invalid options argument. Options must contain: connection, statement, fetch, and primaryKey.'));
  }

  if (!_.has(options, 'connection') || !_.isObject(options.connection)) {
    return cb(new Error('Invalid option used in options argument. Missing or invalid connection.'));
  }

  if (!_.has(options, 'statement') || !_.isPlainObject(options.statement)) {
    return cb(new Error('Invalid option used in options argument. Missing or invalid statement.'));
  }

  if (!_.has(options, 'primaryKey') || !_.isString(options.primaryKey)) {
    return cb(new Error('Invalid option used in options argument. Missing or invalid primaryKey.'));
  }

  if (!_.has(options, 'fetch') || !_.isBoolean(options.fetch)) {
    return cb(new Error('Invalid option used in options argument. Missing or invalid fetch flag.'));
  }
  if (options.fetch) {
    let fetchStatement = {
      from: options.statement.from,
      where: options.statement.where
    };
    compileStatement(fetchStatement, options.meta, (err, compiledFetchQuery) => {
      if (err) {
        return cb(err);
      }
      getColumns(fetchStatement, compiledFetchQuery, 'select', (err, columns) => {
        if (err) {
          return cb(err);
        }
        runQuery({
          connection: options.connection,
          nativeQuery: compiledFetchQuery.nativeQuery,
          statement: {columns: columns, tableName: fetchStatement.from},
          valuesToEscape: compiledFetchQuery.valuesToEscape,
          meta: compiledFetchQuery.meta,
          disconnectOnError: false,
          queryType: 'select'
        }, manager, (err, fetchReport) => {
          if (err) {
            return cb(err);
          }
          compileStatement(options.statement, undefined, (err, compiledUpdateQuery) => {
            if (err) {
              return cb(err);
            }
            getColumns(options.statement, compiledUpdateQuery, 'destroy', (err, columns) => {
              if (err) {
                return cb(err);
              }
              runQuery({
                connection: options.connection,
                nativeQuery: compiledUpdateQuery.nativeQuery,
                statement: {columns: columns, tableName: options.statement.from},
                valuesToEscape: compiledUpdateQuery.valuesToEscape,
                meta: compiledUpdateQuery.meta,
                disconnectOnError: false,
                queryType: 'destroy'
              }, manager, (err) => {
                if (err) {
                  return cb(err);
                }
                return cb(undefined, fetchReport.result);
              });
            });
          });
        });
      });
    });
  } else {
    return cb();
  }
};

const _ = require('@sailshq/lodash');
const compileStatement = require('./compile-statement');
const runQuery = require('./run-query');
const getColumns = require('./get-columns');

module.exports = async function createEach(options, manager, cb) {
  try {
    if (_.isUndefined(options) || !_.isPlainObject(options)) {
      return cb(new Error('Invalid options argument. Options must contain: connection, statement, fetch, and primaryKey.'));
    }

    if (!_.has(options, 'connection') || !_.isObject(options.connection)) {
      return cb(new Error('Invalid option used in options argument. Missing or invalid connection.'));
    }

    if (!_.has(options, 'statement') || !_.isPlainObject(options.statement)) {
      return cb(new Error('Invalid option used in options argument. Missing or invalid statement.'));
    }

    if (!_.has(options, 'fetch') || !_.isBoolean(options.fetch)) {
      return cb(new Error('Invalid option used in options argument. Missing or invalid fetch flag.'));
    }

    if (!_.has(options, 'primaryKey') || !_.isString(options.primaryKey)) {
      return cb(new Error('Invalid option used in options argument. Missing or invalid primaryKey flag.'));
    }
    if (!options.fetch) {
      compileStatement(options.statement, options.meta, (err, compiledQuery) => {
        if (err) {
          return cb(err);
        }
        runQuery({
          connection: options.connection,
          nativeQuery: compiledQuery.nativeQuery,
          valuesToEscape: compiledQuery.valuesToEscape,
          meta: compiledQuery.meta,
          disconnectOnError: false,
          queryType: 'insert'
        }, manager, (err, report) => {
          if (err) {
            return cb(err);
          }
          return cb(err, report.result);
        });
      });
    } else {
      let newRecords = options.statement.insert;
      let insertIds = [];
      const next = () => {
        let fetchStatement = {
          select: '*',
          from: options.statement.into,
          where: {},
          orderBy: [{}]
        };
        fetchStatement.orderBy[0][options.primaryKey] = 'ASC';
        fetchStatement.where[options.primaryKey] = {'in': insertIds};

        compileStatement(fetchStatement, undefined, (err, compiledQuery) => {
          if (err) {
            return cb(err);
          }

          getColumns(fetchStatement, compiledQuery, 'select', (err, columns) => {
            if (err) {
              return cb(err);
            }
            runQuery({
              connection: options.connection,
              nativeQuery: compiledQuery.nativeQuery,
              statement: {columns: columns, tableName: fetchStatement.from},
              valuesToEscape: compiledQuery.valuesToEscape,
              meta: compiledQuery.meta,
              disconnectOnError: false,
              queryType: 'select'
            }, manager, (err, report) => {
              if (err) {
                return cb(err);
              }
              return cb(undefined, report.result);
            });
          });
        });
      };
      for (const newRecord of newRecords) {
        let statement = {
          insert: newRecord,
          into: options.statement.into
        };
        compileStatement(statement, undefined, (err, compiledQuery) => {
          if (err) {
            return cb(err);
          }
          getColumns(options.statement, compiledQuery, 'insert', (err, columns) => {
            if (err) {
              return cb(err);
            }
            let insertOptions = {
              connection: options.connection,
              statement: {columns: columns, tableName: options.statement.into},
              nativeQuery: compiledQuery.nativeQuery,
              valuesToEscape: compiledQuery.valuesToEscape,
              meta: compiledQuery.meta,
              disconnectOnError: false,
              queryType: 'insert'
            };
            if (statement.insert[options.primaryKey]) {
              insertOptions.customPrimaryKey = statement.insert[options.primaryKey];
            }
            runQuery(insertOptions, manager, (err, report) => {
              if (err) {
                return cb(err);
              }
              insertIds.push(report.result.inserted);
              if (insertIds.length === newRecords.length) {
                return next();
              }
            });
          });
        });
      }
    }
  } catch (err) {
    return cb(err);
  }
};

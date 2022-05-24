const _ = require('@sailshq/lodash');
const compileStatement = require('./compile-statement');
const runQuery = require('./run-query');
const getColumns = require('./get-columns');

module.exports = async function create(options, manager, cb) {
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


  compileStatement(options.statement, undefined, (err, compiledQuery) => {
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

      if (options.statement.insert[options.primaryKey]) {
        insertOptions.customPrimaryKey = options.statement.insert[options.primaryKey];
      }


      runQuery(insertOptions, manager, (err, report) => {
        if (err) {
          return cb(err);
        }
        if (report) {
          if (!options.fetch) {
            return cb(undefined, report.result);
          }
          let fetchStatement = {
            select: '*',
            from: options.statement.into,
            where: {}
          };

          fetchStatement.where[options.primaryKey] = report.result.inserted;
          compileStatement(fetchStatement, undefined, (err, compiledQuery) => {
            if (err) {
              return cb(err);
            }
            let columnsFetch = Object.keys(fetchStatement.where);
            if (fetchStatement.where.and) {
              columnsFetch = [];
              for (const column of fetchStatement.where.and) {
                if (Object.keys(column)[0] === 'or') {
                  for (const columnOr of column.or) {
                    columnsFetch.push(Object.keys(columnOr)[0]);
                  }
                } else {
                  columnsFetch.push(Object.keys(column)[0]);
                }
              }
            }
            runQuery({
              connection: options.connection,
              nativeQuery: compiledQuery.nativeQuery,
              statement: {columns: columnsFetch, tableName: fetchStatement.from},
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
        }
      });
    });
  });
};

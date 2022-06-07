const _ = require('@sailshq/lodash');
const runQuery = require('./run-query');
const compileStatement = require('./compile-statement');
const getColumns = require('./get-columns');

module.exports = async (options, manager, cb) => {
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

  let fetchStatementSelect = {
    select: [options.primaryKey],
    from: options.statement.using,
    where: options.statement.where
  };

  compileStatement(fetchStatementSelect, options.meta, (err, compiledFetchSelectQuery) => {
    if (err) {
      return cb(err);
    }
    getColumns(fetchStatementSelect, compiledFetchSelectQuery, 'select', (err, columnsSelect) => {
      if (err) {
        return cb(err);
      }
      runQuery({
        connection: options.connection,
        statement: {columns: columnsSelect, tableName: fetchStatementSelect.from},
        nativeQuery: compiledFetchSelectQuery.nativeQuery,
        valuesToEscape: compiledFetchSelectQuery.valuesToEscape,
        meta: compiledFetchSelectQuery.meta,
        disconnectOnError: false,
        queryType: 'select'
      }, manager, (err, selectReport) => {
        if (err) {
          return cb(err);
        }
        if (selectReport.result.length > 0) {
          compileStatement(options.statement, undefined,(err, compiledUpdateQuery) => {
            if (err) {
              return cb(err);
            }
            if (compiledUpdateQuery.nativeQuery.includes('top (@p0)') &&
              typeof compiledUpdateQuery.valuesToEscape[compiledUpdateQuery.valuesToEscape.length - 1] === 'number') {
              const top = compiledUpdateQuery.valuesToEscape[compiledUpdateQuery.valuesToEscape.length - 1];
              compiledUpdateQuery.valuesToEscape.unshift(top);
              compiledUpdateQuery.valuesToEscape.pop();
            }
            getColumns(options.statement, compiledUpdateQuery, 'update', (err, columnsUpdate) => {
              if (err) {
                return cb(err);
              }
              getColumns(options.statement, compiledUpdateQuery, 'select', (err, columnsWhere) => {
                if (err) {
                  return cb(err);
                }
                columnsUpdate = columnsUpdate.concat(columnsWhere);
                runQuery({
                  connection: options.connection,
                  statement: {columns: columnsUpdate, tableName: options.statement.using},
                  nativeQuery: compiledUpdateQuery.nativeQuery,
                  valuesToEscape: compiledUpdateQuery.valuesToEscape,
                  meta: compiledUpdateQuery.meta,
                  disconnectOnError: false,
                  queryType: 'update'
                }, manager, (err) => {
                  if (err) {
                    return cb(err);
                  }
                  if (options.fetch) {
                    let fetchStatementAfterUpdate = {
                      select: '*',
                      from: options.statement.using,
                      where: {}
                    };
                    let selectPks = _.map(selectReport.result, function mapPks(record) {
                      return record[options.primaryKey];
                    });
                    fetchStatementAfterUpdate.where[options.primaryKey] = {
                      in: selectPks
                    };
                    if (!_.isUndefined(options.statement.update[options.primaryKey])) {
                      if (selectPks.length === 0) { /* do nothing */
                      } else if (selectPks.length === 1) {
                        const oldPkValue = selectPks[0];
                        _.remove(fetchStatementAfterUpdate.where[options.primaryKey].in, oldPkValue);
                        const newPkValue = options.statement.update[options.primaryKey];
                        fetchStatementAfterUpdate.where[options.primaryKey].in.push(newPkValue);
                      } else {
                        return cb(new Error('Consistency violation: Updated multiple records to have the same primary key value. (PK' +
                          ' values should be unique!)'));
                      }
                    }

                    compileStatement(fetchStatementAfterUpdate, undefined, (err, compiledFetchQueryAfterUpdate) => {
                      if (err) {
                        return cb(err);
                      }
                      getColumns(fetchStatementAfterUpdate, compiledFetchQueryAfterUpdate, 'select', (err, columnsFetchAfterUpdate) => {
                        if (err) {
                          return cb(err);
                        }
                        runQuery({
                          connection: options.connection,
                          statement: {columns: columnsFetchAfterUpdate, tableName: fetchStatementAfterUpdate.from},
                          nativeQuery: compiledFetchQueryAfterUpdate.nativeQuery,
                          valuesToEscape: compiledFetchQueryAfterUpdate.valuesToEscape,
                          meta: compiledFetchQueryAfterUpdate.meta,
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
                  } else {
                    return cb(undefined, undefined);
                  }
                });
              });
            });
          });
        } else {
          return cb(undefined, []);
        }
      });
    });
  });
};

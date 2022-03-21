const _ = require('@sailshq/lodash');
const runQuery = require('./run-query');
const compileStatement = require('./compile-statement');
const getColumns = require('./get-columns');

module.exports = async(options, manager) => {
  if (_.isUndefined(options) || !_.isPlainObject(options)) {
    return Promise.reject(new Error('Invalid options argument. Options must contain: connection, statement, fetch, and primaryKey.'));
  }

  if (!_.has(options, 'connection') || !_.isObject(options.connection)) {
    return Promise.reject(new Error('Invalid option used in options argument. Missing or invalid connection.'));
  }

  if (!_.has(options, 'statement') || !_.isPlainObject(options.statement)) {
    return Promise.reject(new Error('Invalid option used in options argument. Missing or invalid statement.'));
  }

  if (!_.has(options, 'primaryKey') || !_.isString(options.primaryKey)) {
    return Promise.reject(new Error('Invalid option used in options argument. Missing or invalid primaryKey.'));
  }

  if (!_.has(options, 'fetch') || !_.isBoolean(options.fetch)) {
    return Promise.reject(new Error('Invalid option used in options argument. Missing or invalid fetch flag.'));
  }

  let fetchStatementSelect = {
    select: [options.primaryKey],
    from: options.statement.using,
    where: options.statement.where
  };

  let compiledFetchSelectQuery = await compileStatement(fetchStatementSelect, options.meta).catch(e => {
    return Promise.reject(e);
  });

  const columnsSelect = await getColumns(fetchStatementSelect, compiledFetchSelectQuery, 'select');
  const selectReport = await runQuery({
    connection: options.connection,
    statement: {columns: columnsSelect, tableName: fetchStatementSelect.from},
    nativeQuery: compiledFetchSelectQuery.nativeQuery,
    valuesToEscape: compiledFetchSelectQuery.valuesToEscape,
    meta: compiledFetchSelectQuery.meta,
    disconnectOnError: false,
    queryType: 'select'
  }, manager).catch(err => {
    return Promise.reject(err);
  });
  if (selectReport.result.length > 0) {
    let compiledUpdateQuery = await compileStatement(options.statement).catch(e => {
      return Promise.reject(e);
    });
    if (compiledUpdateQuery.nativeQuery.includes('top (@p0)') &&
      typeof compiledUpdateQuery.valuesToEscape[compiledUpdateQuery.valuesToEscape.length - 1] === 'number') {
      const top = compiledUpdateQuery.valuesToEscape[compiledUpdateQuery.valuesToEscape.length - 1];
      compiledUpdateQuery.valuesToEscape.unshift(top);
      compiledUpdateQuery.valuesToEscape.pop();
    }
    let columnsUpdate = await getColumns(options.statement, compiledUpdateQuery, 'update');
    const columnsWhere = await getColumns(options.statement, compiledUpdateQuery, 'select');
    columnsUpdate = columnsUpdate.concat(columnsWhere);
    let report = await runQuery({
      connection: options.connection,
      statement: {columns: columnsUpdate, tableName: options.statement.using},
      nativeQuery: compiledUpdateQuery.nativeQuery,
      valuesToEscape: compiledUpdateQuery.valuesToEscape,
      meta: compiledUpdateQuery.meta,
      disconnectOnError: false,
      queryType: 'update'
    }, manager).catch(err => {
      return Promise.reject(err);
    });

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
          return Promise.reject(new Error('Consistency violation: Updated multiple records to have the same primary key value. (PK' +
            ' values should be unique!)'));
        }
      }

      let compiledFetchQueryAfterUpdate = await compileStatement(fetchStatementAfterUpdate).catch(err => {
        return Promise.reject(err);
      });

      let columnsFetchAfterUpdate = await getColumns(fetchStatementAfterUpdate, compiledFetchQueryAfterUpdate, 'select');
      report = await runQuery({
        connection: options.connection,
        statement: {columns: columnsFetchAfterUpdate, tableName: fetchStatementAfterUpdate.from},
        nativeQuery: compiledFetchQueryAfterUpdate.nativeQuery,
        valuesToEscape: compiledFetchQueryAfterUpdate.valuesToEscape,
        meta: compiledFetchQueryAfterUpdate.meta,
        disconnectOnError: false,
        queryType: 'select'
      }, manager).catch(err => {
        return Promise.reject(err);
      });
      return Promise.resolve(report.result);
    }
  }
  return Promise.resolve([]);
};

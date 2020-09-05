//  ██╗   ██╗██████╗ ██████╗  █████╗ ████████╗███████╗
//  ██║   ██║██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝██╔════╝
//  ██║   ██║██████╔╝██║  ██║███████║   ██║   █████╗
//  ██║   ██║██╔═══╝ ██║  ██║██╔══██║   ██║   ██╔══╝
//  ╚██████╔╝██║     ██████╔╝██║  ██║   ██║   ███████╗
//   ╚═════╝ ╚═╝     ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝
//
// Modify the record(s) and return the values that were modified if needed.
// If a fetch was performed, first the records need to be searched for with the
// primary key selected.

const _ = require('@sailshq/lodash');
const runQuery = require('./run-query');
const compileStatement = require('./compile-statement');


module.exports = async(options, manager) => {
  //  ╦  ╦╔═╗╦  ╦╔╦╗╔═╗╔╦╗╔═╗  ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
  //  ╚╗╔╝╠═╣║  ║ ║║╠═╣ ║ ║╣   │ │├─┘ │ ││ ││││└─┐
  //   ╚╝ ╩ ╩╩═╝╩═╩╝╩ ╩ ╩ ╚═╝  └─┘┴   ┴ ┴└─┘┘└┘└─┘
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


  //  ╔═╗╔═╗╔╦╗  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐┌─┐  ┌┐ ┌─┐┬┌┐┌┌─┐  ┬ ┬┌─┐┌┬┐┌─┐┌┬┐┌─┐┌┬┐
  //  ║ ╦║╣  ║   ├┬┘├┤ │  │ │├┬┘ ││└─┐  ├┴┐├┤ │││││ ┬  │ │├─┘ ││├─┤ │ ├┤  ││
  //  ╚═╝╚═╝ ╩   ┴└─└─┘└─┘└─┘┴└──┴┘└─┘  └─┘└─┘┴┘└┘└─┘  └─┘┴  ─┴┘┴ ┴ ┴ └─┘─┴┘
  // If a fetch is used, the records that will be updated need to be found first.
  // This is because in order to (semi) accurately return the records that were
  // updated in MySQL first they need to be found, then updated, then found again.
  // Why? Because if you have a criteria such as update name to foo where name = bar
  // Once the records have been updated there is no way to get them again. So first
  // select the primary keys of the records to update, update the records, and then
  // search for those records.
  // Only look up the records if fetch was used
  if (!options.fetch) {
    return Promise.resolve();
  }
  // Otherwise build up a select query
  let fetchStatementSelect = {
    select: [options.primaryKey],
    from: options.statement.using,
    where: options.statement.where
  };

  //  ╔═╗╔═╗╔╦╗╔═╗╦╦  ╔═╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ║  ║ ║║║║╠═╝║║  ║╣   │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╚═╝╚═╝╩ ╩╩  ╩╩═╝╚═╝  └─┘└└─┘└─┘┴└─ ┴
  // Compile the statement into a native query.
  let compiledFetchSelectQuery = await compileStatement(fetchStatementSelect).catch(e => {
    return Promise.reject(e);
  });

  //  ╦═╗╦ ╦╔╗╔  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ╠╦╝║ ║║║║  │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╩╚═╚═╝╝╚╝  └─┘└└─┘└─┘┴└─ ┴
  // Run the initial find query

  let columnsSelect = Object.keys(fetchStatementSelect.where);
  if (fetchStatementSelect.where.and) {
    columnsSelect = [];
    for (const column of fetchStatementSelect.where.and) {
      if (Object.keys(column)[0] === 'or') {
        for (const columnOr of column.or) {
          columnsSelect.push(Object.keys(columnOr)[0]);
        }
      } else {
        columnsSelect.push(Object.keys(column)[0]);
      }
    }
  }
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

  //  ╔═╗╔═╗╔╦╗╔═╗╦╦  ╔═╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ║  ║ ║║║║╠═╝║║  ║╣   │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╚═╝╚═╝╩ ╩╩  ╩╩═╝╚═╝  └─┘└└─┘└─┘┴└─ ┴
  // Compile the update statement into a native query.
  let compiledUpdateQuery = await compileStatement(options.statement).catch(e => {
    return Promise.reject(e);
  });
  if (compiledUpdateQuery.nativeQuery.includes('top (@p0)') &&
    typeof compiledUpdateQuery.valuesToEscape[compiledUpdateQuery.valuesToEscape.length - 1] === 'number') {
    const top = compiledUpdateQuery.valuesToEscape[compiledUpdateQuery.valuesToEscape.length - 1];
    compiledUpdateQuery.valuesToEscape.unshift(top);
    compiledUpdateQuery.valuesToEscape.pop();
  }

  //  ╦═╗╦ ╦╔╗╔  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ╠╦╝║ ║║║║  │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╩╚═╚═╝╝╚╝  └─┘└└─┘└─┘┴└─ ┴
  // Run the initial query
  let columnsUpdate = Object.keys(options.statement.update).sort();
  let columnsWhere = Object.keys(options.statement.where);
  if (options.statement.where.and) {
    columnsWhere = [];
    for (const column of options.statement.where.and) {
      if (Object.keys(column)[0] === 'or') {
        for (const columnOr of column.or) {
          columnsWhere.push(Object.keys(columnOr)[0]);
        }
      } else {
        columnsWhere.push(Object.keys(column)[0]);
      }
    }
  }
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

  // If no fetch was used, then nothing else needs to be done.
  if (!options.fetch) {
    return Promise.resolve(report.result);
  }

  //  ╔═╗╔═╗╦═╗╔═╗╔═╗╦═╗╔╦╗  ┌┬┐┬ ┬┌─┐  ┌─┐┌─┐┌┬┐┌─┐┬ ┬
  //  ╠═╝║╣ ╠╦╝╠╣ ║ ║╠╦╝║║║   │ ├─┤├┤   ├┤ ├┤  │ │  ├─┤
  //  ╩  ╚═╝╩╚═╚  ╚═╝╩╚═╩ ╩   ┴ ┴ ┴└─┘  └  └─┘ ┴ └─┘┴ ┴
  // Otherwise, fetch the newly inserted record
  let fetchStatementAfterUpdate = {
    select: '*',
    from: options.statement.using,
    where: {}
  };

  // Build the fetch statement where clause
  let selectPks = _.map(selectReport.result, function mapPks(record) {
    return record[options.primaryKey];
  });
  fetchStatementAfterUpdate.where[options.primaryKey] = {
    in: selectPks
  };


// Handle case where pk value was changed:
  if (!_.isUndefined(options.statement.update[options.primaryKey])) {
    // There should only ever be either zero or one record that were found before.
    if (selectPks.length === 0) { /* do nothing */
    } else if (selectPks.length === 1) {
      var oldPkValue = selectPks[0];
      _.remove(fetchStatementAfterUpdate.where[options.primaryKey].in, oldPkValue);
      var newPkValue = options.statement.update[options.primaryKey];
      fetchStatementAfterUpdate.where[options.primaryKey].in.push(newPkValue);
    } else {
      return Promise.reject(new Error('Consistency violation: Updated multiple records to have the same primary key value. (PK' +
        ' values should be unique!)'));
    }
  }


//  ╔═╗╔═╗╔╦╗╔═╗╦╦  ╔═╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
//  ║  ║ ║║║║╠═╝║║  ║╣   │─┼┐│ │├┤ ├┬┘└┬┘
//  ╚═╝╚═╝╩ ╩╩  ╩╩═╝╚═╝  └─┘└└─┘└─┘┴└─ ┴
// Compile the statement into a native query.
  let compiledFetchQueryAfterUpdate = await compileStatement(fetchStatementAfterUpdate).catch(err => {
    return Promise.reject(err);
  });

//  ╦═╗╦ ╦╔╗╔  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
//  ╠╦╝║ ║║║║  │─┼┐│ │├┤ ├┬┘└┬┘
//  ╩╚═╚═╝╝╚╝  └─┘└└─┘└─┘┴└─ ┴
// Run the fetch query.
  let columnsFetchAfterUpdate = Object.keys(fetchStatementAfterUpdate.where);
  if (fetchStatementAfterUpdate.where.and) {
    columnsFetchAfterUpdate = [];
    for (const column of fetchStatementAfterUpdate.where.and) {
      if (Object.keys(column)[0] === 'or') {
        for (const columnOr of column.or) {
          columnsFetchAfterUpdate.push(Object.keys(columnOr)[0]);
        }
      } else {
        columnsFetchAfterUpdate.push(Object.keys(column)[0]);
      }
    }
  }
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
;

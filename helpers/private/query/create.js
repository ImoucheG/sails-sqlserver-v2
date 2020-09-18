//   ██████╗██████╗ ███████╗ █████╗ ████████╗███████╗
//  ██╔════╝██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔════╝
//  ██║     ██████╔╝█████╗  ███████║   ██║   █████╗
//  ██║     ██╔══██╗██╔══╝  ██╔══██║   ██║   ██╔══╝
//  ╚██████╗██║  ██║███████╗██║  ██║   ██║   ███████╗
//   ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝
//
// Perform a create query and fetch the record if needed.

const _ = require('@sailshq/lodash');
const compileStatement = require('./compile-statement');
const runQuery = require('./run-query');
const getColumns = require('./get-columns');

module.exports = async function createEach(options, manager) {
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

  if (!_.has(options, 'fetch') || !_.isBoolean(options.fetch)) {
    return Promise.reject(new Error('Invalid option used in options argument. Missing or invalid fetch flag.'));
  }

  if (!_.has(options, 'primaryKey') || !_.isString(options.primaryKey)) {
    return Promise.reject(new Error('Invalid option used in options argument. Missing or invalid primaryKey flag.'));
  }


  //  ╔═╗╔═╗╔╦╗╔═╗╦╦  ╔═╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ║  ║ ║║║║╠═╝║║  ║╣   │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╚═╝╚═╝╩ ╩╩  ╩╩═╝╚═╝  └─┘└└─┘└─┘┴└─ ┴
  // Compile the statement into a native query.
  let compiledQuery = await compileStatement(options.statement).catch(err => {
    return Promise.reject(err);
  });

  //  ╦═╗╦ ╦╔╗╔  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ╠╦╝║ ║║║║  │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╩╚═╚═╝╝╚╝  └─┘└└─┘└─┘┴└─ ┴
  // Run the initial query (bulk insert)

  const columns = await getColumns(options.statement, compiledQuery, 'insert');
  let insertOptions = {
    connection: options.connection,
    statement: {columns: columns, tableName: options.statement.into},
    nativeQuery: compiledQuery.nativeQuery,
    valuesToEscape: compiledQuery.valuesToEscape,
    meta: compiledQuery.meta,
    disconnectOnError: false,
    queryType: 'insert'
  };

  // Determine if a custom primary key value was used. If so pass it down so that
  // the report can be used correctly. MySQL doesn't return these values.
  if (options.statement.insert[options.primaryKey]) {
    insertOptions.customPrimaryKey = options.statement.insert[options.primaryKey];
  }


  let report = await runQuery(insertOptions, manager).catch(err => {
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
  let fetchStatement = {
    select: '*',
    from: options.statement.into,
    where: {}
  };

  // Build up the WHERE clause for the statement to get the newly inserted
  // records.
  fetchStatement.where[options.primaryKey] = report.result.inserted;


  //  ╔═╗╔═╗╔╦╗╔═╗╦╦  ╔═╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ║  ║ ║║║║╠═╝║║  ║╣   │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╚═╝╚═╝╩ ╩╩  ╩╩═╝╚═╝  └─┘└└─┘└─┘┴└─ ┴
  // Compile the statement into a native query.
  compiledQuery = await compileStatement(fetchStatement).catch(err => {
    return Promise.reject(err);
  });


  //  ╦═╗╦ ╦╔╗╔  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ╠╦╝║ ║║║║  │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╩╚═╚═╝╝╚╝  └─┘└└─┘└─┘┴└─ ┴
  // Run the fetch query.
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
  report = await runQuery({
    connection: options.connection,
    nativeQuery: compiledQuery.nativeQuery,
    statement: {columns: columnsFetch, tableName: fetchStatement.from},
    valuesToEscape: compiledQuery.valuesToEscape,
    meta: compiledQuery.meta,
    disconnectOnError: false,
    queryType: 'select'
  }, manager).catch(err => {
    return Promise.reject(err);
  });
  return Promise.resolve(report.result);
};

//  ██████╗ ███████╗███████╗████████╗██████╗  ██████╗ ██╗   ██╗
//  ██╔══██╗██╔════╝██╔════╝╚══██╔══╝██╔══██╗██╔═══██╗╚██╗ ██╔╝
//  ██║  ██║█████╗  ███████╗   ██║   ██████╔╝██║   ██║ ╚████╔╝
//  ██║  ██║██╔══╝  ╚════██║   ██║   ██╔══██╗██║   ██║  ╚██╔╝
//  ██████╔╝███████╗███████║   ██║   ██║  ██║╚██████╔╝   ██║
//  ╚═════╝ ╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝    ╚═╝
//
// Destroy the record(s) and return the values that were destroyed if needed.
// If a fetch was performed, first the records need to be searched for with the
// primary key selected.

const _ = require('@sailshq/lodash');
const runQuery = require('./run-query');
const compileStatement = require('./compile-statement');
const getColumns = require('./get-columns');


module.exports = async function insertRecord(options, manager) {
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


  //  ╔═╗╔═╗╔╦╗  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐┌─┐  ┌┐ ┌─┐┬┌┐┌┌─┐  ┌┬┐┌─┐┌─┐┌┬┐┬─┐┌─┐┬ ┬┌─┐┌┬┐
  //  ║ ╦║╣  ║   ├┬┘├┤ │  │ │├┬┘ ││└─┐  ├┴┐├┤ │││││ ┬   ││├┤ └─┐ │ ├┬┘│ │└┬┘├┤  ││
  //  ╚═╝╚═╝ ╩   ┴└─└─┘└─┘└─┘┴└──┴┘└─┘  └─┘└─┘┴┘└┘└─┘  ─┴┘└─┘└─┘ ┴ ┴└─└─┘ ┴ └─┘─┴┘
  // If a fetch is used, the records that will be destroyed need to be found first.
  // This is because in order to (semi) accurately return the records that were
  // destroyed in MySQL first they need to be found, then destroyed.
  // Only look up the records if fetch was used
  let fetchReport;
  if (options.fetch) {

    // Otherwise build up a select query
    var fetchStatement = {
      from: options.statement.from,
      where: options.statement.where
    };

    //  ╔═╗╔═╗╔╦╗╔═╗╦╦  ╔═╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ║  ║ ║║║║╠═╝║║  ║╣   │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╚═╝╚═╝╩ ╩╩  ╩╩═╝╚═╝  └─┘└└─┘└─┘┴└─ ┴
    // Compile the statement into a native query.
    let compiledFetchQuery = await compileStatement(fetchStatement, options.meta).catch(e => {
      return Promise.reject(e);
    });

    //  ╦═╗╦ ╦╔╗╔  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ╠╦╝║ ║║║║  │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╩╚═╚═╝╝╚╝  └─┘└└─┘└─┘┴└─ ┴
    // Run the initial find query
    const columns = await getColumns(fetchStatement, compiledFetchQuery, 'select');
    fetchReport = await runQuery({
      connection: options.connection,
      nativeQuery: compiledFetchQuery.nativeQuery,
      statement: {columns: columns, tableName: fetchStatement.from},
      valuesToEscape: compiledFetchQuery.valuesToEscape,
      meta: compiledFetchQuery.meta,
      disconnectOnError: false,
      queryType: 'select'
    }, manager).catch(err => {
      return Promise.reject(err);
    });
  }

  //  ╔═╗╔═╗╔╦╗╔═╗╦╦  ╔═╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ║  ║ ║║║║╠═╝║║  ║╣   │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╚═╝╚═╝╩ ╩╩  ╩╩═╝╚═╝  └─┘└└─┘└─┘┴└─ ┴
  // Compile the destroy statement into a native query.
  let compiledUpdateQuery = await compileStatement(options.statement).catch(e => {      // If the statement could not be compiled, return an error.
    return Promise.reject(e);
  });

  //  ╦═╗╦ ╦╔╗╔  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ╠╦╝║ ║║║║  │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╩╚═╚═╝╝╚╝  └─┘└└─┘└─┘┴└─ ┴
  // Run the destroy query
  const columns = await getColumns(options.statement, compiledUpdateQuery, 'destroy');
  let report = await runQuery({
    connection: options.connection,
    nativeQuery: compiledUpdateQuery.nativeQuery,
    statement: {columns: columns, tableName: options.statement.from},
    valuesToEscape: compiledUpdateQuery.valuesToEscape,
    meta: compiledUpdateQuery.meta,
    disconnectOnError: false,
    queryType: 'destroy'
  }, manager).catch(err => {
    return Promise.reject(err);
  });
  // If no fetch was used, then nothing else needs to be done.
  if (!options.fetch) {
    return Promise.resolve(report.result);
  }
  // Otherwise, return the selected records
  return Promise.resolve(fetchReport.result);
};

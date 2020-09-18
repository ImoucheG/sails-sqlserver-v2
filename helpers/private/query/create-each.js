//   ██████╗██████╗ ███████╗ █████╗ ████████╗███████╗    ███████╗ █████╗  ██████╗██╗  ██╗
//  ██╔════╝██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔════╝    ██╔════╝██╔══██╗██╔════╝██║  ██║
//  ██║     ██████╔╝█████╗  ███████║   ██║   █████╗      █████╗  ███████║██║     ███████║
//  ██║     ██╔══██╗██╔══╝  ██╔══██║   ██║   ██╔══╝      ██╔══╝  ██╔══██║██║     ██╔══██║
//  ╚██████╗██║  ██║███████╗██║  ██║   ██║   ███████╗    ███████╗██║  ██║╚██████╗██║  ██║
//   ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝    ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
//
// Run creates in order and return the records. This is needed because MySQL
// lacks the ability to return multiple insert id's from a bulk insert.
//
// So when a createEach call from Waterline is made with the `fetch: true` flag
// turned on, the records must be inserted one by one in order to return the
// correct primary keys.

const _ = require('@sailshq/lodash');
const compileStatement = require('./compile-statement');
const runQuery = require('./run-query');
const getColumns = require('./get-columns');

module.exports = async function createEach(options, manager) {
  try {
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


    //  ███╗   ██╗ ██████╗ ███╗   ██╗      ███████╗███████╗████████╗ ██████╗██╗  ██╗
    //  ████╗  ██║██╔═══██╗████╗  ██║      ██╔════╝██╔════╝╚══██╔══╝██╔════╝██║  ██║
    //  ██╔██╗ ██║██║   ██║██╔██╗ ██║█████╗█████╗  █████╗     ██║   ██║     ███████║
    //  ██║╚██╗██║██║   ██║██║╚██╗██║╚════╝██╔══╝  ██╔══╝     ██║   ██║     ██╔══██║
    //  ██║ ╚████║╚██████╔╝██║ ╚████║      ██║     ███████╗   ██║   ╚██████╗██║  ██║
    //  ╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═══╝      ╚═╝     ╚══════╝   ╚═╝    ╚═════╝╚═╝  ╚═╝
    //
    //   ██████╗██████╗ ███████╗ █████╗ ████████╗███████╗
    //  ██╔════╝██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔════╝
    //  ██║     ██████╔╝█████╗  ███████║   ██║   █████╗
    //  ██║     ██╔══██╗██╔══╝  ██╔══██║   ██║   ██╔══╝
    //  ╚██████╗██║  ██║███████╗██║  ██║   ██║   ███████╗
    //   ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝
    //
    // If the fetch flag was used, then the statement will need to be broken up
    // into a series of async queries. Otherwise just run a bulk insert.
    if (!options.fetch) {
      //  ╔═╗╔═╗╔╦╗╔═╗╦╦  ╔═╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
      //  ║  ║ ║║║║╠═╝║║  ║╣   │─┼┐│ │├┤ ├┬┘└┬┘
      //  ╚═╝╚═╝╩ ╩╩  ╩╩═╝╚═╝  └─┘└└─┘└─┘┴└─ ┴
      // Compile the statement into a native query.
      let compiledQuery = await compileStatement(options.statement, options.meta).catch(err => {
        return Promise.reject(err);
      });

      //  ╦═╗╦ ╦╔╗╔  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
      //  ╠╦╝║ ║║║║  │─┼┐│ │├┤ ├┬┘└┬┘
      //  ╩╚═╚═╝╝╚╝  └─┘└└─┘└─┘┴└─ ┴
      // Run the initial query (bulk insert)
      const report = await runQuery({
        connection: options.connection,
        nativeQuery: compiledQuery.nativeQuery,
        valuesToEscape: compiledQuery.valuesToEscape,
        meta: compiledQuery.meta,
        disconnectOnError: false,
        queryType: 'insert'
      }, manager).catch(err => {
        return Promise.reject(err);
      });
      return Promise.resolve(report.result);
    }


    //  ███████╗███████╗████████╗ ██████╗██╗  ██╗     ██████╗██████╗ ███████╗ █████╗ ████████╗███████╗
    //  ██╔════╝██╔════╝╚══██╔══╝██╔════╝██║  ██║    ██╔════╝██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔════╝
    //  █████╗  █████╗     ██║   ██║     ███████║    ██║     ██████╔╝█████╗  ███████║   ██║   █████╗
    //  ██╔══╝  ██╔══╝     ██║   ██║     ██╔══██║    ██║     ██╔══██╗██╔══╝  ██╔══██║   ██║   ██╔══╝
    //  ██║     ███████╗   ██║   ╚██████╗██║  ██║    ╚██████╗██║  ██║███████╗██║  ██║   ██║   ███████╗
    //  ╚═╝     ╚══════╝   ╚═╝    ╚═════╝╚═╝  ╚═╝     ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝
    //
    // Break apart the statement's insert records and create a single create query
    // for each one. Collect the result of the insertId's to be returned.
    let newRecords = options.statement.insert;
    let insertIds = [];

    // Be sure to run these in series so that the insert order is maintained.
    for (const newRecord of newRecords) {
      // Build up a statement to use.
      let statement = {
        insert: newRecord,
        into: options.statement.into
      };

      //  ╔═╗╔═╗╔╦╗╔═╗╦╦  ╔═╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
      //  ║  ║ ║║║║╠═╝║║  ║╣   │─┼┐│ │├┤ ├┬┘└┬┘
      //  ╚═╝╚═╝╩ ╩╩  ╩╩═╝╚═╝  └─┘└└─┘└─┘┴└─ ┴
      // Compile the statement into a native query.
      let compiledQuery = await compileStatement(statement).catch(err => {
        return Promise.reject(err);
      });
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
      if (statement.insert[options.primaryKey]) {
        insertOptions.customPrimaryKey = statement.insert[options.primaryKey];
      }

      //  ╦═╗╦ ╦╔╗╔  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
      //  ╠╦╝║ ║║║║  │─┼┐│ │├┤ ├┬┘└┬┘
      //  ╩╚═╚═╝╝╚╝  └─┘└└─┘└─┘┴└─ ┴
      // Run the initial query (bulk insert)
      const report = await runQuery(insertOptions, manager).catch(err => {
        return Promise.reject(err);
      });
      // Add the insert id to the array
      insertIds.push(report.result.inserted);
    }
    //  ╔═╗╔═╗╦═╗╔═╗╔═╗╦═╗╔╦╗  ┌┬┐┬ ┬┌─┐  ┌─┐┌─┐┌┬┐┌─┐┬ ┬
    //  ╠═╝║╣ ╠╦╝╠╣ ║ ║╠╦╝║║║   │ ├─┤├┤   ├┤ ├┤  │ │  ├─┤
    //  ╩  ╚═╝╩╚═╚  ╚═╝╩╚═╩ ╩   ┴ ┴ ┴└─┘  └  └─┘ ┴ └─┘┴ ┴
    var fetchStatement = {
      select: '*',
      from: options.statement.into,
      where: {},
      orderBy: [{}]
    };

    // Sort the records by primary key
    fetchStatement.orderBy[0][options.primaryKey] = 'ASC';

    // Build up the WHERE clause for the statement to get the newly inserted
    // records.
    fetchStatement.where[options.primaryKey] = {'in': insertIds};


    //  ╔═╗╔═╗╔╦╗╔═╗╦╦  ╔═╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ║  ║ ║║║║╠═╝║║  ║╣   │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╚═╝╚═╝╩ ╩╩  ╩╩═╝╚═╝  └─┘└└─┘└─┘┴└─ ┴
    // Compile the statement into a native query.
    let compiledQuery = await compileStatement(fetchStatement).catch(err => {
      return Promise.reject(err);
    });


    //  ╦═╗╦ ╦╔╗╔  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ╠╦╝║ ║║║║  │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╩╚═╚═╝╝╚╝  └─┘└└─┘└─┘┴└─ ┴
    // Run the fetch query.
    const columns = await getColumns(fetchStatement, compiledQuery, 'select');
    const report = await runQuery({
      connection: options.connection,
      nativeQuery: compiledQuery.nativeQuery,
      statement: {columns: columns, tableName: fetchStatement.from},
      valuesToEscape: compiledQuery.valuesToEscape,
      meta: compiledQuery.meta,
      disconnectOnError: false,
      queryType: 'select'
    }, manager).catch(err => {
      return Promise.reject(err);
    });
    return Promise.resolve(report.result);
  } catch (err) {
    return Promise.reject(err);
  }
};

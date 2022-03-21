const _ = require('@sailshq/lodash');
const compileStatement = require('./compile-statement');
const runQuery = require('./run-query');
const getColumns = require('./get-columns');

module.exports = async function createEach(options, manager) {
  try {
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
    if (!options.fetch) {
      let compiledQuery = await compileStatement(options.statement, options.meta).catch(err => {
        return Promise.reject(err);
      });
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

    let newRecords = options.statement.insert;
    let insertIds = [];
    for (const newRecord of newRecords) {
      let statement = {
        insert: newRecord,
        into: options.statement.into
      };
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
      if (statement.insert[options.primaryKey]) {
        insertOptions.customPrimaryKey = statement.insert[options.primaryKey];
      }
      const report = await runQuery(insertOptions, manager).catch(err => {
        return Promise.reject(err);
      });
      insertIds.push(report.result.inserted);
    }
    let fetchStatement = {
      select: '*',
      from: options.statement.into,
      where: {},
      orderBy: [{}]
    };

    fetchStatement.orderBy[0][options.primaryKey] = 'ASC';
    fetchStatement.where[options.primaryKey] = {'in': insertIds};

    let compiledQuery = await compileStatement(fetchStatement).catch(err => {
      return Promise.reject(err);
    });

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

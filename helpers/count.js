module.exports = require('machine').build({
  friendlyName: 'Count',
  description: 'Return the count of the records matched by the query.',
  inputs: {
    datastore: {
      description: 'The datastore to use for connections.',
      extendedDescription: 'Datastores represent the config and manager required to obtain an active database connection.',
      required: true,
      readOnly: true,
      example: '==='
    },
    models: {
      description: 'An object containing all of the model definitions that have been registered.',
      required: true,
      example: '==='
    },
    query: {
      description: 'A valid stage three Waterline query.',
      required: true,
      example: '==='
    }
  },
  exits: {
    success: {
      description: 'The results of the count query.',
      outputExample: '==='
    },
    invalidDatastore: {
      description: 'The datastore used is invalid. It is missing key pieces.'
    },
    badConnection: {
      friendlyName: 'Bad connection',
      description: 'A connection either could not be obtained or there was an error using the connection.'
    }
  },
  fn: async function count(inputs, exits) {
    const Converter = require('waterline-utils').query.converter;
    const Helpers = require('./private');

    let query = inputs.query;
    query.meta = query.meta || {};
    let model = inputs.models[query.using];
    if (!model) {
      return exits.invalidDatastore();
    }

    let statement;
    try {
      statement = Converter({
        model: query.using,
        method: 'count',
        criteria: query.criteria
      });
    } catch (e) {
      return exits.error(e);
    }

    let compiledQuery = await Helpers.query.compileStatement(statement, query.meta).catch(err => {
      return exits.error(err);
    });

    const reportConnection = await Helpers.connection.spawnPool(inputs.datastore).catch(err => {
      return exits.badConnection(err);
    });

    let queryType = 'count';
    let columns = await Helpers.query.getColumns(statement, compiledQuery);
    const report = await Helpers.query.runQuery({
      connection: reportConnection.connection,
      pool: reportConnection.pool,
      statement: {columns: columns, tableName: statement.from},
      nativeQuery: compiledQuery.nativeQuery,
      valuesToEscape: compiledQuery.valuesToEscape,
      meta: compiledQuery.meta,
      queryType: queryType,
      disconnectOnError: true
    }, inputs.datastore.manager).catch(err => {
      return exits.error(err);
    });
    return exits.success(report.result);
  }
});

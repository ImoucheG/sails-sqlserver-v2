module.exports = require('machine').build({
  friendlyName: 'Select',
  description: 'Find record(s) in the database.',
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
      description: 'The results of the select query.',
      outputVariableName: 'records',
      outputType: 'ref'
    },
    invalidDatastore: {
      description: 'The datastore used is invalid. It is missing key pieces.'
    },
    badConnection: {
      friendlyName: 'Bad connection',
      description: 'A connection either could not be obtained or there was an error using the connection.'
    },
    queryFailed: {
      friendlyName: 'Not can execute or prepare a query',
      outputType: 'ref'
    }
  },
  fn: async function select(inputs, exits) {
    const WLUtils = require('waterline-utils');
    const Converter = WLUtils.query.converter;
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
        method: 'find',
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
    let queryType = 'select';
    let columns = await Helpers.query.getColumns(statement, compiledQuery);
    const report = await Helpers.query.runQuery({
      connection: reportConnection.connection,
      pool: reportConnection.pool,
      nativeQuery: compiledQuery.nativeQuery,
      valuesToEscape: compiledQuery.valuesToEscape,
      meta: compiledQuery.meta,
      queryType: queryType,
      statement: {columns: columns, tableName: statement.from},
      disconnectOnError: true
    }, inputs.datastore.manager).catch(err => {
      return exits.error(err);
    });

    if (report) {
      let selectRecords = report.result;
      let orm = {
        collections: inputs.models
      };
      try {
        Helpers.query.processEachRecord({
          records: selectRecords,
          identity: model.identity,
          orm: orm
        });
      } catch (e) {
        return exits.error(e);
      }
      return exits.success({records: selectRecords});
    }
  }
});

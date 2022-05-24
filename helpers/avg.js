module.exports = require('machine').build({
  friendlyName: 'AVG',
  description: 'Return the Average of the records matched by the query.',
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
      description: 'The results of the avg query.',
      outputType: 'ref'
    },
    invalidDatastore: {
      description: 'The datastore used is invalid. It is missing key pieces.'
    },
    queryFailed: {
      description: 'The query used is invalid'
    },
    badConnection: {
      friendlyName: 'Bad connection',
      description: 'A connection either could not be obtained or there was an error using the connection.'
    }
  },
  fn: async function avg(inputs, exits) {
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
        method: 'avg',
        criteria: query.criteria,
        values: query.numericAttrName
      });
    } catch (e) {
      return exits.queryFailed(e);
    }
    Helpers.query.compileStatement(statement, query.meta, (err, compiledQuery) => {
      if (err) {
        return exits.error(err);
      }
      Helpers.connection.spawnPool(inputs.datastore, (err, reportConnection) => {
        if (err) {
          return exits.badConnection(err);
        }
        Helpers.query.runQuery({
          connection: reportConnection.connection,
          pool: reportConnection.pool,
          nativeQuery: compiledQuery.nativeQuery,
          valuesToEscape: compiledQuery.valuesToEscape,
          meta: compiledQuery.meta,
          queryType: 'avg',
          disconnectOnError: true
        }, inputs.datastore.manager, (err, report) => {
          if (err) {
            return exits.queryFailed(err);
          }
          return exits.success(report.result);
        });
      });
    });
  }
});

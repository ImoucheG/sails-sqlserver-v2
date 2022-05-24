module.exports = require('machine').build({
  friendlyName: 'Destroy',
  description: 'Destroy record(s) in the database matching a query criteria.',
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
      description: 'The results of the destroy query.',
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
  fn: async function destroy(inputs, exits) {
    const _ = require('@sailshq/lodash');
    const WLUtils = require('waterline-utils');
    const Helpers = require('./private');

    const Converter = WLUtils.query.converter;
    let query = inputs.query;
    query.meta = query.meta || {};

    let model = inputs.models[query.using];
    if (!model) {
      return exits.invalidDatastore();
    }

    let fetchRecords = false;

    let statement;
    try {
      statement = Converter({
        model: query.using,
        method: 'destroy',
        criteria: query.criteria
      });
    } catch (e) {
      return exits.queryFailed(e);
    }

    if (_.has(query.meta, 'fetch') && query.meta.fetch) {
      fetchRecords = true;
    }

    let primaryKeyField = model.primaryKey;
    let primaryKeyColumnName = model.definition[primaryKeyField].columnName;

    Helpers.connection.spawnPool(inputs.datastore, (err, reportConnection) => {
      if (err) {
        return exits.badConnection(err);
      }
      Helpers.query.destroy({
        connection: reportConnection.connection,
        pool: reportConnection.pool,
        statement: statement,
        fetch: fetchRecords,
        primaryKey: primaryKeyColumnName
      }, inputs.datastore.manager, (err, destroyedRecords) => {
        if (err) {
          return exits.queryFailed(err);
        }
        if (fetchRecords) {
          let orm = {
            collections: inputs.models
          };
          try {
            Helpers.query.processEachRecord({
              records: destroyedRecords,
              identity: model.identity,
              orm: orm
            });
          } catch (e) {
            return exits.queryFailed(e);
          }
          return exits.success(destroyedRecords);
        }
        return exits.success();
      });
    });
  }
});

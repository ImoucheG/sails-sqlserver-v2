module.exports = require('machine').build({
  friendlyName: 'Create',
  description: `Try Insert a record into  table in the database.`,
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
      description: 'The record was successfully inserted.',
      outputVariableName: 'record',
      outputType: 'ref'
    },
    invalidDatastore: {
      description: 'The datastore used is invalid. It is missing key pieces.'
    },
    badConnection: {
      friendlyName: 'Bad connection',
      description: 'A connection either could not be obtained or there was an error using the connection.'
    },
    notUnique: {
      friendlyName: 'Not Unique',
      outputType: 'ref'
    },
    queryFailed: {
      friendlyName: 'Not can execute or prepare a query',
      outputType: 'ref'
    }
  },
  fn: async function create(inputs, exits) {
    const _ = require('@sailshq/lodash');
    const utils = require('waterline-utils');
    const Helpers = require('./private');

    let query = inputs.query;
    query.meta = query.meta || {};
    let model = inputs.models[query.using];
    if (!model) {
      return exits.invalidDatastore();
    }
    let fetchRecords = false;
    let fauxOrm = {
      collections: inputs.models
    };

    try {
      Helpers.query.preProcessRecord({
        records: [query.newRecord],
        identity: model.identity,
        orm: fauxOrm
      });
    } catch (e) {
      return exits.queryFailed(e);
    }

    let statement;
    try {
      statement = utils.query.converter({
        model: query.using,
        method: 'create',
        values: query.newRecord
      });
    } catch (e) {
      return exits.queryFailed(e);
    }

    if (_.has(query.meta, 'fetch') && query.meta.fetch) {
      fetchRecords = true;
    }

    let primaryKeyField = model.primaryKey;
    let primaryKeyColumnName = model.definition[primaryKeyField].columnName;

    if (_.isNull(statement.insert[primaryKeyColumnName])) {
      delete statement.insert[primaryKeyColumnName];
    }

    Helpers.connection.spawnPool(inputs.datastore, (err, reportConnection) => {
      if (err) {
        return exits.badConnection(err);
      }

      Helpers.query.create({
        connection: reportConnection.connection,
        pool: reportConnection.pool,
        manager: inputs.datastore.manager,
        statement: statement,
        fetch: fetchRecords,
        primaryKey: primaryKeyColumnName
      }, inputs.datastore.manager, (err, insertedRecords) => {
        if (err) {
          return exits.queryFailed(err);
        }
        if (fetchRecords && insertedRecords) {
          try {
            Helpers.query.processEachRecord({
              records: insertedRecords,
              identity: model.identity,
              orm: fauxOrm
            });
          } catch (e) {
            return exits.queryFailed(e);
          }
          let insertedRecord = _.first(insertedRecords);
          return exits.success(insertedRecord);
        } else {
          if (insertedRecords) {
            return exits.success();
          }
        }
      });
    });
  }
});

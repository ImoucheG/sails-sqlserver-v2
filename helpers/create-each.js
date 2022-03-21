module.exports = require('machine').build({
  friendlyName: 'Create Each',
  description: 'Insert multiple records into a table in the database.',
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
      outputExample: '==='
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
      outputExample: '==='
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
        records: query.newRecords,
        identity: model.identity,
        orm: fauxOrm
      });
    } catch (e) {
      return exits.error(e);
    }
    let statement;
    try {
      statement = utils.query.converter({
        model: query.using,
        method: 'createEach',
        values: query.newRecords
      });
    } catch (e) {
      return exits.error(e);
    }

    if (_.has(query.meta, 'fetch') && query.meta.fetch) {
      fetchRecords = true;
    }

    let primaryKeyField = model.primaryKey;
    let primaryKeyColumnName = model.definition[primaryKeyField].columnName;

    _.each(statement.insert, function removeNullPrimaryKey(record) {
      if (_.isNull(record[primaryKeyColumnName])) {
        delete record[primaryKeyColumnName];
      }
    });

    const reportConnection = await Helpers.connection.spawnPool(inputs.datastore).catch(err => {
      return exits.badConnection(err);
    });

    const insertedRecords = await Helpers.query.createEach({
      connection: reportConnection.connection,
      pool: reportConnection.pool,
      statement: statement,
      fetch: fetchRecords,
      primaryKey: primaryKeyColumnName
    }, inputs.datastore.manager).catch(err => {
      if (err.footprint && err.footprint.identity === 'notUnique') {
        return exits.notUnique(err);
      }
      return exits.error(err);
    });

    if (fetchRecords) {
      try {
        Helpers.query.processEachRecord({
          records: insertedRecords,
          identity: model.identity,
          orm: fauxOrm
        });
      } catch (e) {
        return exits.error(e);
      }
      return exits.success({records: insertedRecords});
    }
    return exits.success();
  }
});

module.exports = require('machine').build({
  friendlyName: 'Register Data Store',
  description: 'Register a new datastore for making connections.',
  inputs: {
    identity: {
      description: 'A unique identitifer for the connection.',
      example: 'localPostgres',
      required: true
    },
    config: {
      description: 'The configuration to use for the data store.',
      required: true,
      example: '==='
    },
    models: {
      description: 'The Waterline models that will be used with this data store.',
      required: true,
      example: '==='
    },
    datastores: {
      description: 'An object containing all of the data stores that have been registered.',
      required: true,
      example: '==='
    },
    modelDefinitions: {
      description: 'An object containing all of the model definitions that have been registered.',
      required: true,
      example: '==='
    }
  },
  exits: {
    success: {
      description: 'The data store was initialized successfully.'
    },
    badConfiguration: {
      description: 'The configuration was invalid.',
      outputType: 'ref'
    },
    error: {
      description: 'An error occurred',
      outputType: 'ref'
    }
  },
  fn: async function registerDataStore(inputs, exits) {
    const _ = require('@sailshq/lodash');
    const SQLSERVER = require('machinepack-sqlserver-adapter');
    const Helpers = require('./private');

    if (inputs.datastores[inputs.identity]) {
      return exits.badConfiguration(new Error('Datastore `' + inputs.identity + '` is already registered.'));
    }

    let hasURL = _.has(inputs.config, 'url');

    if (!hasURL && !inputs.config.host) {
      return exits.badConfiguration(new Error('Datastore  `' + inputs.identity + '` config is missing a host value.'));
    }

    if (!hasURL && !inputs.config.database) {
      return exits.badConfiguration(new Error('Datastore  `' + inputs.identity + '` config is missing a value for the database name.'));
    }

    try {
      _.each(inputs.models, function checkPrimaryKey(modelDef, modelIdentity) {
        let primaryKeyAttr = modelDef.definition[modelDef.primaryKey];
        if (primaryKeyAttr.required !== true && (!primaryKeyAttr.autoMigrations || primaryKeyAttr.autoMigrations.autoIncrement !== true)) {
          return exits.badConfiguration(new Error('In model `' + modelIdentity + '`, primary key `' + modelDef.primaryKey + '` must have' +
            ' either' +
            ' `required` or `autoIncrement` set.'));
        }
      });
    } catch (e) {
      return exits.badConfiguration(e);
    }

    if (!_.has(inputs.config, 'url')) {
      inputs.config.port = inputs.config.port || '1433';
    }

    try {
      const report = await Helpers.connection.createManager(inputs.config);
      let dbSchema = {};

      _.each(inputs.models, function buildSchema(val) {
        let identity = val.identity;
        let tableName = val.tableName;
        let definition = val.definition;

        dbSchema[tableName] = {
          identity: identity,
          tableName: tableName,
          definition: definition,
          attributes: definition,
          primaryKey: val.primaryKey
        };
      });

      inputs.datastores[inputs.identity] = {
        manager: report.manager,
        config: inputs.config,
        driver: SQLSERVER
      };

      inputs.modelDefinitions[inputs.identity] = dbSchema;

      return exits.success();
    } catch (e) {
      if (!e.code || e.code === 'error') {
        return exits.error(new Error('There was an error creating a new manager for the connection with a url of: ' +
          inputs.config.host + ':' + inputs.config.port + ' on "' + inputs.config.user + '@' + inputs.config.database + '"\n\n' + e.stack));
      }
      if (e.code === 'failed') {
        return exits.badConfiguration(new Error('There was an error creating a new manager for the connection with a url of: ' +
          inputs.config.host + ':' + inputs.config.port + ' on "' + inputs.config.user + '@' + inputs.config.database + '"\n\n' + e.stack));
      }

      if (e.code === 'malformed') {
        return exits.badConfiguration(new Error('There was an error creating a new manager for the connection with a url of: ' +
          inputs.config.host + ':' + inputs.config.port + ' on "' + inputs.config.user + '@' + inputs.config.database + '"\n\n' + e.stack));
      }
      return exits.error(new Error('There was an error creating a new manager for the connection with a url of: ' +
        inputs.config.host + ':' + inputs.config.port + ' on "' + inputs.config.user + '@' + inputs.config.database + '"\n\n' + e.stack));
    }
  }
});

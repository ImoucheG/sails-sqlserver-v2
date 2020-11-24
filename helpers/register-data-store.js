//  ██████╗ ███████╗ ██████╗ ██╗███████╗████████╗███████╗██████╗
//  ██╔══██╗██╔════╝██╔════╝ ██║██╔════╝╚══██╔══╝██╔════╝██╔══██╗
//  ██████╔╝█████╗  ██║  ███╗██║███████╗   ██║   █████╗  ██████╔╝
//  ██╔══██╗██╔══╝  ██║   ██║██║╚════██║   ██║   ██╔══╝  ██╔══██╗
//  ██║  ██║███████╗╚██████╔╝██║███████║   ██║   ███████╗██║  ██║
//  ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝
//
//  ██████╗  █████╗ ████████╗ █████╗     ███████╗████████╗ ██████╗ ██████╗ ███████╗
//  ██╔══██╗██╔══██╗╚══██╔══╝██╔══██╗    ██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗██╔════╝
//  ██║  ██║███████║   ██║   ███████║    ███████╗   ██║   ██║   ██║██████╔╝█████╗
//  ██║  ██║██╔══██║   ██║   ██╔══██║    ╚════██║   ██║   ██║   ██║██╔══██╗██╔══╝
//  ██████╔╝██║  ██║   ██║   ██║  ██║    ███████║   ██║   ╚██████╔╝██║  ██║███████╗
//  ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝    ╚══════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝
//

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
    }
  },
  fn: async function registerDataStore(inputs, exits) {
    // Dependencies
    const _ = require('@sailshq/lodash');
    const SQLSERVER = require('machinepack-sqlserver-adapter');
    const Helpers = require('./private');

    // Validate that the datastore isn't already initialized
    if (inputs.datastores[inputs.identity]) {
      return exits.badConfiguration(new Error('Datastore `' + inputs.identity + '` is already registered.'));
    }

    //  ╦  ╦╔═╗╦  ╦╔╦╗╔═╗╔╦╗╔═╗  ┌─┐┌─┐┌┐┌┌─┐┬┌─┐
    //  ╚╗╔╝╠═╣║  ║ ║║╠═╣ ║ ║╣   │  │ ││││├┤ ││ ┬
    //   ╚╝ ╩ ╩╩═╝╩═╩╝╩ ╩ ╩ ╚═╝  └─┘└─┘┘└┘└  ┴└─┘
    // If a URL config value was not given, ensure that all the various pieces
    // needed to create one exist.
    let hasURL = _.has(inputs.config, 'url');

    // Validate that the connection has a host and database property
    if (!hasURL && !inputs.config.host) {
      return exits.badConfiguration(new Error('Datastore  `' + inputs.identity + '` config is missing a host value.'));
    }

    if (!hasURL && !inputs.config.database) {
      return exits.badConfiguration(new Error('Datastore  `' + inputs.identity + '` config is missing a value for the database name.'));
    }

    // Loop through every model assigned to the datastore we're registering,
    // and ensure that each one's primary key is either required or auto-incrementing.
    try {
      _.each(inputs.models, function checkPrimaryKey(modelDef, modelIdentity) {
        let primaryKeyAttr = modelDef.definition[modelDef.primaryKey];

        // Ensure that the model's primary key has either `autoIncrement` or `required`
        if (primaryKeyAttr.required !== true && (!primaryKeyAttr.autoMigrations || primaryKeyAttr.autoMigrations.autoIncrement !== true)) {
          return exits.badConfiguration(new Error('In model `' + modelIdentity + '`, primary key `' + modelDef.primaryKey + '` must have' +
            ' either' +
            ' `required` or `autoIncrement` set.'));
        }
      });
    } catch (e) {
      return exits.badConfiguration(e);
    }

    //  ╔═╗╔═╗╔╗╔╔═╗╦═╗╔═╗╔╦╗╔═╗  ┌─┐┌─┐┌┐┌┌┐┌┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
    //  ║ ╦║╣ ║║║║╣ ╠╦╝╠═╣ ║ ║╣   │  │ │││││││├┤ │   │ ││ ││││
    //  ╚═╝╚═╝╝╚╝╚═╝╩╚═╩ ╩ ╩ ╚═╝  └─┘└─┘┘└┘┘└┘└─┘└─┘ ┴ ┴└─┘┘└┘
    //  ┌─┐┌┬┐┬─┐┬┌┐┌┌─┐  ┬ ┬┬─┐┬
    //  └─┐ │ ├┬┘│││││ ┬  │ │├┬┘│
    //  └─┘ ┴ ┴└─┴┘└┘└─┘  └─┘┴└─┴─┘
    // If the connection details were not supplied as a URL, make them into one.
    // This is required for the underlying driver in use.
    if (!_.has(inputs.config, 'url')) {
      inputs.config.port = inputs.config.port || '1433';
    }

    //  ╔═╗╦═╗╔═╗╔═╗╔╦╗╔═╗  ┌┬┐┌─┐┌┐┌┌─┐┌─┐┌─┐┬─┐
    //  ║  ╠╦╝║╣ ╠═╣ ║ ║╣   │││├─┤│││├─┤│ ┬├┤ ├┬┘
    //  ╚═╝╩╚═╚═╝╩ ╩ ╩ ╚═╝  ┴ ┴┴ ┴┘└┘┴ ┴└─┘└─┘┴└─
    // Create a manager to handle the datastore connection config
    try {
      const report = await Helpers.connection.createManager(inputs.config).catch(err => {
        return exits.badConfiguration(err);
      });
      // Build up a database schema for this connection that can be used
      // throughout the adapter
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

      // Store the connection
      inputs.datastores[inputs.identity] = {
        manager: report.manager,
        config: inputs.config,
        driver: SQLSERVER
      };

      // Store the db schema for the connection
      inputs.modelDefinitions[inputs.identity] = dbSchema;

      return exits.success();
    } catch (e) {
      if (!e.code || e.code === 'error') {
        return exits.error(new Error('There was an error creating a new manager for the connection with a url of: ' + inputs.config.url + '\n\n' + e.stack));
      }
      if (e.code === 'failed') {
        return exits.badConfiguration(new Error('There was an error creating a new manager for the connection with a url of: ' + inputs.config.url + '\n\n' + e.stack));
      }

      if (e.code === 'malformed') {
        return exits.badConfiguration(new Error('There was an error creating a new manager for the connection with a url of: ' + inputs.config.url + '\n\n' + e.stack));
      }
      return exits.error(new Error('There was an error creating a new manager for the connection with a url of: ' + inputs.config.url + '\n\n' + e.stack));
    }
  }
});

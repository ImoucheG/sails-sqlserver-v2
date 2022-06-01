const _ = require('@sailshq/lodash');
const async = require('async');
const Helpers = require('../helpers');
module.exports = (function sailsSQLServer() {
  let datastores = {};
  let modelDefinitions = {};
  return {
    identity: 'sails-sqlserver',
    adapterApiVersion: 1,
    defaults: {
      host: 'localhost\\SQLEXPRESS',
      port: 1433,
      schema: true
    },
    datastores: datastores,

    registerDatastore: async function registerDatastore(datastoreConfig, models, cb) {
      const identity = datastoreConfig.identity;
      if (!identity) {
        return cb(new Error('Invalid datastore config. A datastore should contain a unique identity property.'));
      }
      Helpers.registerDataStore({
        identity: identity,
        config: datastoreConfig,
        models: models,
        datastores: datastores,
        modelDefinitions: modelDefinitions
      }).switch({
        error: (err) => {
          return cb(err);
        },
        badConfiguration: (err) => {
          return cb(err);
        },
        success: () => {
          return cb();
        }
      });
    },

    teardown: function teardown(identity, cb) {
      let datastoreIdentities = [];
      if (!identity) {
        datastoreIdentities = datastoreIdentities.concat(_.keys(datastores));
      } else {
        datastoreIdentities.push(identity);
      }
      async.eachSeries(datastoreIdentities, function teardownDatastore(datastoreIdentity, next) {
        Helpers.teardown({
          identity: datastoreIdentity,
          datastores: datastores,
          modelDefinitions: modelDefinitions
        }).switch({
          error: (err) => {
            return cb(err);
          },
          success: () => {
            return next();
          }
        });
      }, function asyncCb(err) {
        return cb(err);
      });
    },


    //  ██████╗  ██████╗ ██╗
    //  ██╔══██╗██╔═══██╗██║
    //  ██║  ██║██║   ██║██║
    //  ██║  ██║██║▄▄ ██║██║
    //  ██████╔╝╚██████╔╝███████╗
    //  ╚═════╝  ╚══▀▀═╝ ╚══════╝
    //
    // Methods related to manipulating data stored in the database.
    create: async function create(datastoreName, query, cb) {
      const datastore = datastores[datastoreName];
      const models = modelDefinitions[datastoreName];
      Helpers.create({
        datastore: datastore,
        models: models,
        query: query
      })
        .switch({
          error: (err) => {
            return cb(err);
          },
          success: (report) => {
            return cb(undefined, report || {error: 'fetchNotFound', meta: query});
          }
        });
    },
    createEach: async function createEach(datastoreName, query, cb) {
      const datastore = datastores[datastoreName];
      const models = modelDefinitions[datastoreName];
      Helpers.createEach({
        datastore: datastore,
        models: models,
        query: query
      })
        .switch({
          error: (err) => {
            return cb(err);
          },
          success: (reports) => {
            return cb(undefined, reports || {error: 'fetchNotFound', meta: query});
          }
        });
    },
    find: async function find(datastoreName, query, cb) {
      let datastore = datastores[datastoreName];
      let models = modelDefinitions[datastoreName];
      Helpers.select({
        datastore: datastore,
        models: models,
        query: query
      })
        .switch({
          error: (err) => {
            return cb(err);
          },
          success: (reports) => {
            return cb(undefined, reports);
          }
        });
    },
    update: async function update(datastoreName, query, cb) {
      const datastore = datastores[datastoreName];
      const models = modelDefinitions[datastoreName];
      Helpers.update({
        datastore: datastore,
        models: models,
        query: query
      })
        .switch({
          error: (err) => {
            return cb(err);
          },
          success: (reports) => {
            return cb(undefined, reports || undefined);
          }
        });
    },
    destroy: async function destroy(datastoreName, query, cb) {
      const datastore = datastores[datastoreName];
      const models = modelDefinitions[datastoreName];
      Helpers.destroy({
        datastore: datastore,
        models: models,
        query: query
      })
        .switch({
          error: (err) => {
            return cb(err);
          },
          success: (reports) => {
            return cb(undefined, reports || undefined);
          }
        });
    },
    join: async function join(datastoreName, query, cb) {
      const datastore = datastores[datastoreName];
      const models = modelDefinitions[datastoreName];
      Helpers.join({
        datastore: datastore,
        models: models,
        query: query
      })
        .switch({
          error: (err) => {
            return cb(err);
          },
          success: (reports) => {
            return cb(undefined, reports);
          }
        });
    },
    avg: async function avg(datastoreName, query, cb) {
      const datastore = datastores[datastoreName];
      const models = modelDefinitions[datastoreName];
      Helpers.avg({
        datastore: datastore,
        models: models,
        query: query
      })
        .switch({
          error: (err) => {
            return cb(err);
          },
          success: (report) => {
            return cb(undefined, report);
          }
        });
    },
    sum: async function sum(datastoreName, query, cb) {
      const datastore = datastores[datastoreName];
      const models = modelDefinitions[datastoreName];
      Helpers.sum({
        datastore: datastore,
        models: models,
        query: query
      })
        .switch({
          error: (err) => {
            return cb(err);
          },
          success: (report) => {
            return cb(undefined, report);
          }
        });
    },
    count: async function count(datastoreName, query, cb) {
      const datastore = datastores[datastoreName];
      const models = modelDefinitions[datastoreName];
      Helpers.count({
        datastore: datastore,
        models: models,
        query: query
      })
        .switch({
          error: (err) => {
            return cb(err);
          },
          success: (report) => {
            return cb(undefined, report);
          }
        });
    },


    //  ██████╗ ██████╗ ██╗
    //  ██╔══██╗██╔══██╗██║
    //  ██║  ██║██║  ██║██║
    //  ██║  ██║██║  ██║██║
    //  ██████╔╝██████╔╝███████╗
    //  ╚═════╝ ╚═════╝ ╚══════╝
    //
    // Methods related to modifying the underlying data structure of the
    // database.


    //  ╔╦╗╔═╗╔═╗╔═╗╦═╗╦╔╗ ╔═╗  ┌┬┐┌─┐┌┐ ┬  ┌─┐
    //   ║║║╣ ╚═╗║  ╠╦╝║╠╩╗║╣    │ ├─┤├┴┐│  ├┤
    //  ═╩╝╚═╝╚═╝╚═╝╩╚═╩╚═╝╚═╝   ┴ ┴ ┴└─┘┴─┘└─┘
    // Describe a table and get back a normalized model schema format.
    // (This is used to allow Sails to do auto-migrations)
    describe: function describe(datastoreName, tableName, cb, meta) {
      // TODO Implement
      return cb();
    },


    //  ╔╦╗╔═╗╔═╗╦╔╗╔╔═╗  ┌┬┐┌─┐┌┐ ┬  ┌─┐
    //   ║║║╣ ╠╣ ║║║║║╣    │ ├─┤├┴┐│  ├┤
    //  ═╩╝╚═╝╚  ╩╝╚╝╚═╝   ┴ ┴ ┴└─┘┴─┘└─┘
    // Build a new table in the database.
    // (This is used to allow Sails to do auto-migrations)
    define: function define(datastoreName, tableName, definition, cb, meta) {
      // TODO Implement
      return cb();
    },


    //  ╔═╗╦═╗╔═╗╔═╗╔╦╗╔═╗  ┌─┐┌─┐┬ ┬┌─┐┌┬┐┌─┐
    //  ║  ╠╦╝║╣ ╠═╣ ║ ║╣   └─┐│  ├─┤├┤ │││├─┤
    //  ╚═╝╩╚═╚═╝╩ ╩ ╩ ╚═╝  └─┘└─┘┴ ┴└─┘┴ ┴┴ ┴
    // Create a new Postgres Schema (namespace) in the database.
    createSchema: function createSchema(datastoreName, schemaName, cb, meta) {
      // TODO Implement
      return cb();
    },


    //  ╔╦╗╦═╗╔═╗╔═╗  ┌┬┐┌─┐┌┐ ┬  ┌─┐
    //   ║║╠╦╝║ ║╠═╝   │ ├─┤├┴┐│  ├┤
    //  ═╩╝╩╚═╚═╝╩     ┴ ┴ ┴└─┘┴─┘└─┘
    // Remove a table from the database.
    drop: function drop(datastoreName, tableName, relations, cb, meta) {
      // TODO Implement
      return cb();
    },


    //  ╔═╗╔═╗╔╦╗  ┌─┐┌─┐┌─┐ ┬ ┬┌─┐┌┐┌┌─┐┌─┐
    //  ╚═╗║╣  ║   └─┐├┤ │─┼┐│ │├┤ ││││  ├┤
    //  ╚═╝╚═╝ ╩   └─┘└─┘└─┘└└─┘└─┘┘└┘└─┘└─┘
    // Set a sequence in an auto-incrementing primary key to a known value.
    setSequence: function setSequence(datastoreName, sequenceName, sequenceValue, cb, meta) {
      // TODO Implement
      return cb();
    },
  };
})();

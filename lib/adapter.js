const _ = require('@sailshq/lodash');
const async = require('async');
const Helpers = require('../helpers');

module.exports = (function sailsSQLServer() {
  // Keep track of all the datastores used by the app
  let datastores = {};
  // Keep track of all the connection model definitions
  let modelDefinitions = {};

  let adapter = {
    identity: 'sails-sqlserver',
    // Waterline Adapter API Version
    adapterApiVersion: 1,
    defaults: {
      host: 'localhost\\SQLEXPRESS',
      port: 1433,
      schema: true
    },
    //  ╔═╗═╗ ╦╔═╗╔═╗╔═╗╔═╗  ┌─┐┬─┐┬┬  ┬┌─┐┌┬┐┌─┐
    //  ║╣ ╔╩╦╝╠═╝║ ║╚═╗║╣   ├─┘├┬┘│└┐┌┘├─┤ │ ├┤
    //  ╚═╝╩ ╚═╩  ╚═╝╚═╝╚═╝  ┴  ┴└─┴ └┘ ┴ ┴ ┴ └─┘
    //  ┌┬┐┌─┐┌┬┐┌─┐┌─┐┌┬┐┌─┐┬─┐┌─┐┌─┐
    //   ││├─┤ │ ├─┤└─┐ │ │ │├┬┘├┤ └─┐
    //  ─┴┘┴ ┴ ┴ ┴ ┴└─┘ ┴ └─┘┴└─└─┘└─┘
    // This allows outside access to the connection manager.
    datastores: datastores,
    //  ╦═╗╔═╗╔═╗╦╔═╗╔╦╗╔═╗╦═╗  ┌┬┐┌─┐┌┬┐┌─┐┌─┐┌┬┐┌─┐┬─┐┌─┐
    //  ╠╦╝║╣ ║ ╦║╚═╗ ║ ║╣ ╠╦╝   ││├─┤ │ ├─┤└─┐ │ │ │├┬┘├┤
    //  ╩╚═╚═╝╚═╝╩╚═╝ ╩ ╚═╝╩╚═  ─┴┘┴ ┴ ┴ ┴ ┴└─┘ ┴ └─┘┴└─└─┘
    // Register a datastore config and generate a connection manager for it.
    registerDatastore: async function registerDatastore(datastoreConfig, models, cb) {
      var identity = datastoreConfig.identity;
      if (!identity) {
        return cb(new Error('Invalid datastore config. A datastore should contain a unique identity property.'));
      }
      await Helpers.registerDataStore({
        identity: identity,
        config: datastoreConfig,
        models: models,
        datastores: datastores,
        modelDefinitions: modelDefinitions
      }).catch(err => {
        let e = new Error(err.raw.message);
        e.footprint = err.raw.footprint;
        return cb(e);
      });
      return cb();
    },


    //  ╔╦╗╔═╗╔═╗╦═╗╔╦╗╔═╗╦ ╦╔╗╔  ┌─┐┌─┐┌┐┌┌┐┌┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
    //   ║ ║╣ ╠═╣╠╦╝ ║║║ ║║║║║║║  │  │ │││││││├┤ │   │ ││ ││││
    //   ╩ ╚═╝╩ ╩╩╚══╩╝╚═╝╚╩╝╝╚╝  └─┘└─┘┘└┘┘└┘└─┘└─┘ ┴ ┴└─┘┘└┘
    // Destroy a manager and close any connections in it's pool.
    teardown: function teardown(identity, cb) {
      var datastoreIdentities = [];

      // If no specific identity was sent, teardown all the datastores
      if (!identity || identity === null) {
        datastoreIdentities = datastoreIdentities.concat(_.keys(datastores));
      } else {
        datastoreIdentities.push(identity);
      }

      // Teardown each datastore identity manager
      async.eachSeries(datastoreIdentities, function teardownDatastore(datastoreIdentity, next) {
        Helpers.teardown({
          identity: datastoreIdentity,
          datastores: datastores,
          modelDefinitions: modelDefinitions
        }).switch({
          error: function error(err) {
            return next(err);
          },
          success: function success() {
            return next();
          }
        });
      }, function asyncCb(err) {
        cb(err);
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


    //  ╔═╗╦═╗╔═╗╔═╗╔╦╗╔═╗  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐
    //  ║  ╠╦╝║╣ ╠═╣ ║ ║╣   ├┬┘├┤ │  │ │├┬┘ ││
    //  ╚═╝╩╚═╚═╝╩ ╩ ╩ ╚═╝  ┴└─└─┘└─┘└─┘┴└──┴┘
    // Add a new row to the table
    create: async function create(datastoreName, query, cb) {
      const datastore = datastores[datastoreName];
      const models = modelDefinitions[datastoreName];
      let alreadyReturn = false;
      const report = await Helpers.create({
        datastore: datastore,
        models: models,
        query: query
      }).catch(err => {
        if (err.exit === 'error') {
          alreadyReturn = true;
          return cb(err);
        }
        if (err.exit === 'notUnique') {
          let e = new Error(err.message);
          e.footprint = err.footprint;
          alreadyReturn = true;
          return cb(e);
        }
        if (err.exit === 'queryFailed') {
          let e = new Error(err.raw.message);
          e.footprint = err.footprint;
          alreadyReturn = true;
          return cb(e);
        }
        let e = new Error(err.raw.message);
        e.footprint = err.raw.footprint;
        return cb(e);
      });
      const record = report && report.record || undefined;
      if (!alreadyReturn) {
        return cb(undefined, record);
      }
    },


    //  ╔═╗╦═╗╔═╗╔═╗╔╦╗╔═╗  ╔═╗╔═╗╔═╗╦ ╦  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐
    //  ║  ╠╦╝║╣ ╠═╣ ║ ║╣   ║╣ ╠═╣║  ╠═╣  ├┬┘├┤ │  │ │├┬┘ ││
    //  ╚═╝╩╚═╚═╝╩ ╩ ╩ ╚═╝  ╚═╝╩ ╩╚═╝╩ ╩  ┴└─└─┘└─┘└─┘┴└──┴┘
    // Add multiple new rows to the table
    createEach: async function createEach(datastoreName, query, cb) {
      const datastore = datastores[datastoreName];
      const models = modelDefinitions[datastoreName];
      const report = await Helpers.createEach({
        datastore: datastore,
        models: models,
        query: query
      }).catch(err => {
        if (err.exit === 'error') {
          return cb(err);
        }
        if (err.exit === 'notUnique') {
          let e = new Error(err.message);
          e.footprint = err.footprint;
          return cb(e);
        }
        if (err.exit === 'queryFailed') {
          let e = new Error(err.raw.message);
          e.footprint = err.footprint;
          return cb(e);
        }
        let e = new Error(err.raw.message);
        e.footprint = err.raw.footprint;
        return cb(e);
      });
      const records = report && report.records || undefined;
      return cb(undefined, records);
    },


    //  ╔═╗╔═╗╦  ╔═╗╔═╗╔╦╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ╚═╗║╣ ║  ║╣ ║   ║   │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╚═╝╚═╝╩═╝╚═╝╚═╝ ╩   └─┘└└─┘└─┘┴└─ ┴
    // Select Query Logic
    find: async function find(datastoreName, query, cb) {
      let alreadyReturn = false;
      let datastore = datastores[datastoreName];
      let models = modelDefinitions[datastoreName];
      const report = await Helpers.select({
        datastore: datastore,
        models: models,
        query: query
      }).catch(err => {
        alreadyReturn = true;
        if (err.exit === 'queryFailed' || (err.raw &&err.raw.footprint.identity === 'queryFailed')) {
          let e = new Error(err.raw.message);
          e.footprint = err.footprint;
          return cb(e);
        }
        let e = new Error(err.message ? err.message : err.raw.message);
        e.footprint = err.raw && err.raw.footprint ? err.raw.footprint : err.footprint;
        return cb(e);
      });
      if (!alreadyReturn) {
        return cb(undefined, report.records);
      }
    },


    //  ╦ ╦╔═╗╔╦╗╔═╗╔╦╗╔═╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ║ ║╠═╝ ║║╠═╣ ║ ║╣   │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╚═╝╩  ═╩╝╩ ╩ ╩ ╚═╝  └─┘└└─┘└─┘┴└─ ┴
    // Update one or more models in the table
    update: async function update(datastoreName, query, cb) {
      const datastore = datastores[datastoreName];
      const models = modelDefinitions[datastoreName];
      const report = await Helpers.update({
        datastore: datastore,
        models: models,
        query: query
      }).catch(err => {
        if (err.exit === 'error') {
          return cb(err);
        }
        if (err.exit === 'notUnique') {
          let e = new Error(err.message);
          e.footprint = err.footprint;
          return cb(e);
        }
        if (err.exit === 'queryFailed') {
          let e = new Error(err.raw.message);
          e.footprint = err.footprint;
          return cb(e);
        }
        let e = new Error(err.raw.message);
        e.footprint = err.raw.footprint;
        return cb(e);
      });
      if (report) {
        return cb(undefined, report.records);
      }
      return cb();
    },


    //  ╔╦╗╔═╗╔═╗╔╦╗╦═╗╔═╗╦ ╦  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //   ║║║╣ ╚═╗ ║ ╠╦╝║ ║╚╦╝  │─┼┐│ │├┤ ├┬┘└┬┘
    //  ═╩╝╚═╝╚═╝ ╩ ╩╚═╚═╝ ╩   └─┘└└─┘└─┘┴└─ ┴
    // Delete one or more records in a table
    destroy: async function destroy(datastoreName, query, cb) {
      const datastore = datastores[datastoreName];
      const models = modelDefinitions[datastoreName];
      const report = await Helpers.destroy({
        datastore: datastore,
        models: models,
        query: query
      }).catch( err =>  {
        if (err.exit === 'queryFailed') {
          let e = new Error(err.raw.message);
          e.footprint = err.footprint;
          return cb(e);
        }
        let e = new Error(err.raw.message);
        e.footprint = err.raw.footprint;
        return cb(e);
      });
      if (report) {
        return cb(undefined, report.records);
      }
      return cb();
    },


    //  ╔╗╔╔═╗╔╦╗╦╦  ╦╔═╗   ┬┌─┐┬┌┐┌  ┌─┐┬ ┬┌─┐┌─┐┌─┐┬─┐┌┬┐
    //  ║║║╠═╣ ║ ║╚╗╔╝║╣    ││ │││││  └─┐│ │├─┘├─┘│ │├┬┘ │
    //  ╝╚╝╩ ╩ ╩ ╩ ╚╝ ╚═╝  └┘└─┘┴┘└┘  └─┘└─┘┴  ┴  └─┘┴└─ ┴
    // Build up native joins to run on the adapter.
    join: async function join(datastoreName, query, cb) {
      const datastore = datastores[datastoreName];
      const models = modelDefinitions[datastoreName];
      const report = await Helpers.join({
        datastore: datastore,
        models: models,
        query: query
      }).catch(err => {
        if (err.exit === 'queryFailed') {
          let e = new Error(err.raw.message);
          e.footprint = err.footprint;
          return cb(e);
        }
        let e = new Error(err.raw.message);
        e.footprint = err.raw.footprint;
        return cb(e);
      });
      return cb(undefined, report);
    },


    //  ╔═╗╦  ╦╔═╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ╠═╣╚╗╔╝║ ╦  │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╩ ╩ ╚╝ ╚═╝  └─┘└└─┘└─┘┴└─ ┴
    // Find out the average of the query.
    avg: async function avg(datastoreName, query, cb) {
      const datastore = datastores[datastoreName];
      const models = modelDefinitions[datastoreName];
      const report = await Helpers.avg({
        datastore: datastore,
        models: models,
        query: query
      }).catch(err => {
        let e = new Error(err.raw.message);
        e.footprint = err.raw.footprint;
        return cb(e);
      });
      return cb(undefined, report);
    },


    //  ╔═╗╦ ╦╔╦╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ╚═╗║ ║║║║  │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╚═╝╚═╝╩ ╩  └─┘└└─┘└─┘┴└─ ┴
    // Find out the sum of the query.
    sum: async function sum(datastoreName, query, cb) {
      const datastore = datastores[datastoreName];
      const models = modelDefinitions[datastoreName];
      const report = await Helpers.sum({
        datastore: datastore,
        models: models,
        query: query
      }).catch(err => {
        let e = new Error(err.raw.message);
        e.footprint = err.raw.footprint;
        return cb(e);
      });
      return cb(undefined, report);
    },


    //  ╔═╗╔═╗╦ ╦╔╗╔╔╦╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ║  ║ ║║ ║║║║ ║   │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╚═╝╚═╝╚═╝╝╚╝ ╩   └─┘└└─┘└─┘┴└─ ┴
    // Return the number of matching records.
    count: async function count(datastoreName, query, cb) {
      const datastore = datastores[datastoreName];
      const models = modelDefinitions[datastoreName];
      const report = await Helpers.count({
        datastore: datastore,
        models: models,
        query: query
      }).catch(err => {
        let e = new Error(err.raw.message);
        e.footprint = err.raw.footprint;
        return cb(e);
      });
      return cb(undefined, report);
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
      var datastore = datastores[datastoreName];
      Helpers.describe({
        datastore: datastore,
        tableName: tableName,
        meta: meta
      }).switch({
        error: function error(err) {
          return cb(err);
        },
        success: function success(report) {
          // Waterline expects the result to be undefined if the table doesn't
          // exist.
          if (_.keys(report.schema).length) {
            return cb(undefined, report.schema);
          }

          return cb();
        }
      });
    },


    //  ╔╦╗╔═╗╔═╗╦╔╗╔╔═╗  ┌┬┐┌─┐┌┐ ┬  ┌─┐
    //   ║║║╣ ╠╣ ║║║║║╣    │ ├─┤├┴┐│  ├┤
    //  ═╩╝╚═╝╚  ╩╝╚╝╚═╝   ┴ ┴ ┴└─┘┴─┘└─┘
    // Build a new table in the database.
    // (This is used to allow Sails to do auto-migrations)
    define: function define(datastoreName, tableName, definition, cb, meta) {
      // TODO Implement
      var datastore = datastores[datastoreName];
      Helpers.define({
        datastore: datastore,
        tableName: tableName,
        definition: definition,
        meta: meta
      }).switch({
        error: function error(err) {
          return cb(err);
        },
        success: function success() {
          return cb();
        }
      });
    },


    //  ╔═╗╦═╗╔═╗╔═╗╔╦╗╔═╗  ┌─┐┌─┐┬ ┬┌─┐┌┬┐┌─┐
    //  ║  ╠╦╝║╣ ╠═╣ ║ ║╣   └─┐│  ├─┤├┤ │││├─┤
    //  ╚═╝╩╚═╚═╝╩ ╩ ╩ ╚═╝  └─┘└─┘┴ ┴└─┘┴ ┴┴ ┴
    // Create a new Postgres Schema (namespace) in the database.
    createSchema: function createSchema(datastoreName, schemaName, cb, meta) {
      // TODO Implement
      var datastore = datastores[datastoreName];
      Helpers.createSchema({
        datastore: datastore,
        schemaName: schemaName,
        meta: meta
      }).switch({
        error: function error(err) {
          return cb(err);
        },
        success: function success() {
          return cb();
        }
      });
    },


    //  ╔╦╗╦═╗╔═╗╔═╗  ┌┬┐┌─┐┌┐ ┬  ┌─┐
    //   ║║╠╦╝║ ║╠═╝   │ ├─┤├┴┐│  ├┤
    //  ═╩╝╩╚═╚═╝╩     ┴ ┴ ┴└─┘┴─┘└─┘
    // Remove a table from the database.
    drop: function drop(datastoreName, tableName, relations, cb, meta) {
      // TODO Implement
      var datastore = datastores[datastoreName];
      Helpers.drop({
        datastore: datastore,
        tableName: tableName,
        meta: meta
      }).switch({
        error: function error(err) {
          return cb(err);
        },
        badConnection: function badConnection(err) {
          return cb(err);
        },
        success: function success() {
          return cb();
        }
      });
    },


    //  ╔═╗╔═╗╔╦╗  ┌─┐┌─┐┌─┐ ┬ ┬┌─┐┌┐┌┌─┐┌─┐
    //  ╚═╗║╣  ║   └─┐├┤ │─┼┐│ │├┤ ││││  ├┤
    //  ╚═╝╚═╝ ╩   └─┘└─┘└─┘└└─┘└─┘┘└┘└─┘└─┘
    // Set a sequence in an auto-incrementing primary key to a known value.
    setSequence: function setSequence(datastoreName, sequenceName, sequenceValue, cb, meta) {
      // TODO Implement
      var datastore = datastores[datastoreName];
      Helpers.setSequence({
        datastore: datastore,
        sequenceName: sequenceName,
        sequenceValue: sequenceValue,
        meta: meta
      }).switch({
        error: function error(err) {
          return cb(err);
        },
        success: function success() {
          return cb();
        }
      });
    },

  };

  return adapter;
})();

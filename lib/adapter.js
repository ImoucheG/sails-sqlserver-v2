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
      try {
        await Helpers.registerDataStore({
          identity: identity,
          config: datastoreConfig,
          models: models,
          datastores: datastores,
          modelDefinitions: modelDefinitions
        });
        return cb();
      } catch (err) {
        err.isOperational = false;
        throw err;
      }
    },

    teardown: function teardown(identity) {
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
          error: function error(err) {
            throw err;
          },
          success: function success() {
            return next();
          }
        });
      }, function asyncCb(err) {
        throw err;
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
      let alreadyReturn = false;
      const report = await Helpers.create({
        datastore: datastore,
        models: models,
        query: query
      }).catch(err => {
        let e = new Error(err.message ? err.message : err.raw.message);
        e.footprint = err.raw && err.raw.footprint ? err.raw.footprint : err.footprint;
        e.footprint.identity = 'catchall';
        throw e;
      });
      const record = report && report.record || undefined;
      if (!alreadyReturn) {
        return cb(undefined, record);
      }
    },
    createEach: async function createEach(datastoreName, query, cb) {
      const datastore = datastores[datastoreName];
      const models = modelDefinitions[datastoreName];
      const report = await Helpers.createEach({
        datastore: datastore,
        models: models,
        query: query
      }).catch(err => {
        let e = new Error(err.message ? err.message : err.raw.message);
        e.footprint = err.raw && err.raw.footprint ? err.raw.footprint : err.footprint;
        e.footprint.identity = 'catchall';
        throw e;
      });
      const records = report && report.records || undefined;
      return cb(undefined, records);
    },
    find: async function find(datastoreName, query, cb) {
      let alreadyReturn = false;
      let datastore = datastores[datastoreName];
      let models = modelDefinitions[datastoreName];
      const report = await Helpers.select({
        datastore: datastore,
        models: models,
        query: query
      }).catch(err => {
        let e = new Error(err.message ? err.message : err.raw.message);
        e.footprint = err.raw && err.raw.footprint ? err.raw.footprint : err.footprint;
        e.footprint.identity = 'catchall';
        alreadyReturn = true;
        throw e;
      });
      if (!alreadyReturn) {
        return cb(undefined, report.records);
      }
    },
    update: async function update(datastoreName, query, cb) {
      const datastore = datastores[datastoreName];
      const models = modelDefinitions[datastoreName];
      const report = await Helpers.update({
        datastore: datastore,
        models: models,
        query: query
      }).catch(err => {
        let e = new Error(err.message ? err.message : err.raw.message);
        e.footprint = err.raw && err.raw.footprint ? err.raw.footprint : err.footprint;
        e.footprint.identity = 'catchall';
        throw e;
      });
      if (report) {
        return cb(undefined, report.records);
      }
      return cb();
    },
    destroy: async function destroy(datastoreName, query, cb) {
      const datastore = datastores[datastoreName];
      const models = modelDefinitions[datastoreName];
      const report = await Helpers.destroy({
        datastore: datastore,
        models: models,
        query: query
      }).catch(err => {
        let e = new Error(err.message ? err.message : err.raw.message);
        e.footprint = err.raw && err.raw.footprint ? err.raw.footprint : err.footprint;
        e.footprint.identity = 'catchall';
        throw e;
      });
      if (report) {
        return cb(undefined, report.records);
      }
      return cb();
    },
    join: async function join(datastoreName, query, cb) {
      const datastore = datastores[datastoreName];
      const models = modelDefinitions[datastoreName];
      try {
        const report = await Helpers.join({
          datastore: datastore,
          models: models,
          query: query
        });
        return cb(undefined, report);
      } catch (err) {
        let e;
        if (err.exit === 'queryFailed') {
          e = err.raw;
          e.footprint.identity = 'queryFailed';
        } else {
          e = new Error(err.message ? err.message : err.raw.message);
          e.footprint = err.raw && err.raw.footprint ? err.raw.footprint : err.footprint ? err.footprint : err.raw;
          e.footprint.identity = 'catchall';
        }
        throw e;
      }
    },
    avg: async function avg(datastoreName, query, cb) {
      const datastore = datastores[datastoreName];
      const models = modelDefinitions[datastoreName];
      const report = await Helpers.avg({
        datastore: datastore,
        models: models,
        query: query
      }).catch(err => {
        let e = new Error(err.message ? err.message : err.raw.message);
        e.footprint = err.raw && err.raw.footprint ? err.raw.footprint : err.footprint;
        e.footprint.identity = 'catchall';
        throw e;
      });
      return cb(undefined, report);
    },
    sum: async function sum(datastoreName, query, cb) {
      const datastore = datastores[datastoreName];
      const models = modelDefinitions[datastoreName];
      const report = await Helpers.sum({
        datastore: datastore,
        models: models,
        query: query
      }).catch(err => {
        let e = new Error(err.message ? err.message : err.raw.message);
        e.footprint = err.raw && err.raw.footprint ? err.raw.footprint : err.footprint;
        e.footprint.identity = 'catchall';
        throw e;
      });
      return cb(undefined, report);
    },
    count: async function count(datastoreName, query, cb) {
      const datastore = datastores[datastoreName];
      const models = modelDefinitions[datastoreName];
      const report = await Helpers.count({
        datastore: datastore,
        models: models,
        query: query
      }).catch(err => {
        let e = new Error(err.message ? err.message : err.raw.message);
        e.footprint = err.raw && err.raw.footprint ? err.raw.footprint : err.footprint;
        e.footprint.identity = 'catchall';
        throw e;
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

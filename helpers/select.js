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
  fn: async function select({query, models, datastore}, exits) {
    const WLUtils = require('waterline-utils');
    const Converter = WLUtils.query.converter;
    const Helpers = require('./private');

    query.meta = query.meta || {};
    let model = models[query.using];
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
    } catch (err) {
      return exits.queryFailed(err);
    }
    Helpers.query.compileStatement(statement, query.meta, (err, compiledQuery) => {
      if (err) {
        return exits.queryFailed(err);
      }
      Helpers.connection.spawnPool(datastore, (err, reportConnection) => {
        if (err) {
          return exits.badConnection(err);
        }
        Helpers.query.getColumns(statement, compiledQuery, 'select', (err, columns) => {
          if (err) {
            return exits.error(err);
          }
          Helpers.query.runQuery({
            connection: reportConnection.connection,
            pool: reportConnection.pool,
            nativeQuery: compiledQuery.nativeQuery,
            valuesToEscape: compiledQuery.valuesToEscape,
            meta: compiledQuery.meta,
            queryType: 'select',
            statement: {columns: columns, tableName: statement.from},
            disconnectOnError: true
          }, datastore.manager, (err, report) => {
            if (err) {
              return exits.queryFailed(err);
            }
            if (report) {
              try {
                Helpers.query.processEachRecord({
                  records: report.result,
                  identity: model.identity,
                  orm: {
                    collections: models
                  }
                });
              } catch (err) {
                return exits.queryFailed(err);
              }
              return exits.success(report.result);
            }
          });
        });
      });
    });
  }
});

module.exports = require('machine').build({
  friendlyName: 'Join',
  description: 'Support native joins on the database.',
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
      description: 'A normalized Waterline Stage Three Query.',
      required: true,
      example: '==='
    }
  },
  exits: {
    success: {
      description: 'The query was run successfully.',
      outputType: 'ref'
    },
    badConnection: {
      friendlyName: 'Bad connection',
      description: 'A connection either could not be obtained or there was an error using the connection.'
    },
    queryFailed: {
      friendlyName: 'Not can execute or prepare a query',
      outputType: 'ref'
    },
    error: {
      friendlyName: 'Not can execute or prepare a query',
      outputType: 'ref'
    }
  },
  fn: async function join(inputs, exits) {
    const _ = require('@sailshq/lodash');
    const WLUtils = require('waterline-utils');
    const Helpers = require('./private');

    let meta = _.has(inputs.query, 'meta') ? inputs.query.meta : {};

    let model = inputs.models[inputs.query.using];
    if (!model) {
      return exits.invalidDatastore();
    }

    let primaryKeyAttr = model.primaryKey;
    let primaryKeyColumnName = model.definition[primaryKeyAttr].columnName || primaryKeyAttr;

    let orm = {
      collections: inputs.models
    };

    let statements;
    try {
      statements = WLUtils.joins.convertJoinCriteria({
        query: inputs.query,
        getPk: function getPk(tableName) {
          var model = inputs.models[tableName];
          if (!model) {
            return exits.error(new Error('Invalid parent table name used when caching query results. Perhaps the join criteria is' +
              ' invalid?'));
          }
          let pkAttrName = model.primaryKey;
          return model.definition[pkAttrName].columnName || pkAttrName;
        }
      });
    } catch (e) {
      return exits.error(e);
    }

    let compiledQuery = await Helpers.query.compileStatement(statements.parentStatement, meta).catch(err => {
      return exits.error(err);
    });

    const reportConnection = await Helpers.connection.spawnPool(inputs.datastore).catch(err => {
      return exits.error(err);
    });

    let columns = await Helpers.query.getColumns(statements.parentStatement, compiledQuery);
    const parentResults = await Helpers.query.runNativeQuery(reportConnection, inputs.datastore.manager,
      compiledQuery.nativeQuery, compiledQuery.valuesToEscape,
      {columns: columns, tableName: statements.parentStatement.from}, compiledQuery.meta).catch(async err => {
      if (err.exit === 'queryFailed') {
        return exits.queryFailed(err);
      }
      return exits.error(err);
    });
    if (parentResults) {
      if (!_.has(inputs.query, 'joins') || !parentResults.length) {
        return exits.success(parentResults);
      }

      let sortedResults;
      try {
        sortedResults = WLUtils.joins.detectChildrenRecords(primaryKeyColumnName, parentResults);
      } catch (e) {
        return exits.error(e);
      }

      let queryCache;
      try {
        queryCache = Helpers.query.initializeQueryCache({
          instructions: statements.instructions,
          models: inputs.models,
          sortedResults: sortedResults
        });
      } catch (e) {
        return exits.error(e);
      }

      try {
        queryCache.setParents(sortedResults.parents);
      } catch (e) {
        return exits.error(e);
      }

      if (!statements.childStatements || !statements.childStatements.length) {
        let combinedResults;
        try {
          combinedResults = queryCache.combineRecords();
        } catch (e) {
          return exits.error(e);
        }

        try {
          Helpers.query.processEachRecord({
            records: combinedResults,
            identity: model.identity,
            orm: orm
          });
        } catch (e) {
          return exits.error(e);
        }
        return exits.success(combinedResults);
      }

      let parentKeys = _.map(queryCache.getParents(), function pluckPk(record) {
        return record[primaryKeyColumnName];
      });

      for (const template of statements.childStatements) {
        if (template.queryType === 'in') {
          let inClause = _.pullAt(template.statement.where.and, template.statement.where.and.length - 1);
          inClause = _.first(inClause);
          _.each(inClause, function modifyInClause(val) {
            val.in = parentKeys;
          });
          template.statement.where.and.push(inClause);
        }
        if (template.queryType === 'union') {
          let unionStatements = [];
          _.each(parentKeys, function buildUnion(parentPk) {
            let unionStatement = _.merge({}, template.statement);
            let andClause = _.pullAt(unionStatement.where.and, unionStatement.where.and.length - 1);
            _.each(_.first(andClause), function replaceValue(val, key) {
              _.first(andClause)[key] = parentPk;
            });
            unionStatement.where.and.push(_.first(andClause));
            unionStatements.push(unionStatement);
          });
          if (unionStatements.length) {
            template.statement = {unionAll: unionStatements};
          }
        }
        if (template.statement) {
          let compiledQuery = await Helpers.query.compileStatement(template.statement, meta).catch(e => {
            console.error(e);
          });
          let columns = await Helpers.query.getColumns(template.statement, compiledQuery);
          const queryResults = await Helpers.query.runNativeQuery(reportConnection, inputs.datastore.manager, compiledQuery.nativeQuery,
            compiledQuery.valuesToEscape, {
              columns: columns,
              tableName: template.statement.from
            }, compiledQuery.meta).catch(err => {
            console.error(err);
          });
          queryCache.extend(queryResults, template.instructions);
        }
      }
      let combinedResults = queryCache.combineRecords();
      try {
        Helpers.query.processEachRecord({
          records: combinedResults,
          identity: model.identity,
          orm: orm
        });
      } catch (e) {
        return exits.error(e);
      }
      return exits.success(combinedResults);
    }
  }
});

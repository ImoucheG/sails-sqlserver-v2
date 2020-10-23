//       ██╗ ██████╗ ██╗███╗   ██╗
//       ██║██╔═══██╗██║████╗  ██║
//       ██║██║   ██║██║██╔██╗ ██║
//  ██   ██║██║   ██║██║██║╚██╗██║
//  ╚█████╔╝╚██████╔╝██║██║ ╚████║
//   ╚════╝  ╚═════╝ ╚═╝╚═╝  ╚═══╝
//
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
    }
  },
  fn: async function join(inputs, exits) {
    const _ = require('@sailshq/lodash');
    const async = require('async');
    const WLUtils = require('waterline-utils');
    const Helpers = require('./private');

    let meta = _.has(inputs.query, 'meta') ? inputs.query.meta : {};

    // Set a flag if a leased connection from outside the adapter was used or not.
    let leased = _.has(meta, 'leasedConnection');


    //  ╔═╗╦╔╗╔╔╦╗  ┌┬┐┌─┐┌┐ ┬  ┌─┐  ┌─┐┬─┐┬┌┬┐┌─┐┬─┐┬ ┬  ┬┌─┌─┐┬ ┬
    //  ╠╣ ║║║║ ║║   │ ├─┤├┴┐│  ├┤   ├─┘├┬┘││││├─┤├┬┘└┬┘  ├┴┐├┤ └┬┘
    //  ╚  ╩╝╚╝═╩╝   ┴ ┴ ┴└─┘┴─┘└─┘  ┴  ┴└─┴┴ ┴┴ ┴┴└─ ┴   ┴ ┴└─┘ ┴
    // Find the model definition
    let model = inputs.models[inputs.query.using];
    if (!model) {
      return exits.invalidDatastore();
    }

    // Grab the primary key attribute for the main table name
    let primaryKeyAttr = model.primaryKey;
    let primaryKeyColumnName = model.definition[primaryKeyAttr].columnName || primaryKeyAttr;

    // Build a fake ORM and process the records.
    let orm = {
      collections: inputs.models
    };

    //  ╔╗ ╦ ╦╦╦  ╔╦╗  ┌─┐┌┬┐┌─┐┌┬┐┌─┐┌┬┐┌─┐┌┐┌┌┬┐┌─┐
    //  ╠╩╗║ ║║║   ║║  └─┐ │ ├─┤ │ ├┤ │││├┤ │││ │ └─┐
    //  ╚═╝╚═╝╩╩═╝═╩╝  └─┘ ┴ ┴ ┴ ┴ └─┘┴ ┴└─┘┘└┘ ┴ └─┘
    // Attempt to build up the statements necessary for the query.
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


    //  ╔═╗╔═╗╔╗╔╦  ╦╔═╗╦═╗╔╦╗  ┌─┐┌─┐┬─┐┌─┐┌┐┌┌┬┐
    //  ║  ║ ║║║║╚╗╔╝║╣ ╠╦╝ ║   ├─┘├─┤├┬┘├┤ │││ │
    //  ╚═╝╚═╝╝╚╝ ╚╝ ╚═╝╩╚═ ╩   ┴  ┴ ┴┴└─└─┘┘└┘ ┴
    //  ┌─┐┌┬┐┌─┐┌┬┐┌─┐┌┬┐┌─┐┌┐┌┌┬┐
    //  └─┐ │ ├─┤ │ ├┤ │││├┤ │││ │
    //  └─┘ ┴ ┴ ┴ ┴ └─┘┴ ┴└─┘┘└┘ ┴
    // Convert the parent statement into a native query. If the query can be run
    // in a single query then this will be the only query that runs.
    let compiledQuery = await Helpers.query.compileStatement(statements.parentStatement, meta).catch(err => {
      return exits.error(err);
    });


    //  ╔═╗╔═╗╔═╗╦ ╦╔╗╔  ┌─┐┌─┐┌┐┌┌┐┌┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
    //  ╚═╗╠═╝╠═╣║║║║║║  │  │ │││││││├┤ │   │ ││ ││││
    //  ╚═╝╩  ╩ ╩╚╩╝╝╚╝  └─┘└─┘┘└┘┘└┘└─┘└─┘ ┴ ┴└─┘┘└┘
    //  ┌─┐┬─┐  ┬ ┬┌─┐┌─┐  ┬  ┌─┐┌─┐┌─┐┌─┐┌┬┐  ┌─┐┌─┐┌┐┌┌┐┌┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
    //  │ │├┬┘  │ │└─┐├┤   │  ├┤ ├─┤└─┐├┤  ││  │  │ │││││││├┤ │   │ ││ ││││
    //  └─┘┴└─  └─┘└─┘└─┘  ┴─┘└─┘┴ ┴└─┘└─┘─┴┘  └─┘└─┘┘└┘┘└┘└─┘└─┘ ┴ ┴└─┘┘└┘
    // Spawn a new connection for running queries on.
    const reportConnection = await Helpers.connection.spawnOrLeaseConnection(inputs.datastore, meta).catch(err => {
      return exits.error(err);
    });


    //  ╦═╗╦ ╦╔╗╔  ┌┬┐┬ ┬┌─┐  ┌┐┌┌─┐┌┬┐┬┬  ┬┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ╠╦╝║ ║║║║   │ ├─┤├┤   │││├─┤ │ │└┐┌┘├┤   │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╩╚═╚═╝╝╚╝   ┴ ┴ ┴└─┘  ┘└┘┴ ┴ ┴ ┴ └┘ └─┘  └─┘└└─┘└─┘┴└─ ┴

    let columns = await Helpers.query.getColumns(statements.parentStatement, compiledQuery);
    const parentResults = await Helpers.query.runNativeQuery(reportConnection, inputs.datastore.manager,
      compiledQuery.nativeQuery, compiledQuery.valuesToEscape,
      {columns: columns, tableName: statements.parentStatement.from}, compiledQuery.meta).catch(async err => {
      // Release the connection on error
      await Helpers.connection.releaseConnection(reportConnection, inputs.datastore.manager, leased);
      return exits.error(err);
    });

    // If there weren't any joins being performed or no parent records were
    // returned, release the connection and return the results.
    if (!_.has(inputs.query, 'joins') || !parentResults.length) {
      await Helpers.connection.releaseConnection(reportConnection, inputs.datastore.manager, leased).catch(err => {
        return exits.error(err);
      });
      return exits.success(parentResults);
    }


    //  ╔═╗╦╔╗╔╔╦╗  ┌─┐┬ ┬┬┬  ┌┬┐┬─┐┌─┐┌┐┌  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐┌─┐
    //  ╠╣ ║║║║ ║║  │  ├─┤││   ││├┬┘├┤ │││  ├┬┘├┤ │  │ │├┬┘ ││└─┐
    //  ╚  ╩╝╚╝═╩╝  └─┘┴ ┴┴┴─┘─┴┘┴└─└─┘┘└┘  ┴└─└─┘└─┘└─┘┴└──┴┘└─┘
    // If there was a join that was either performed or still needs to be
    // performed, look into the results for any children records that may
    // have been joined and splt them out from the parent.
    let sortedResults;
    try {
      sortedResults = WLUtils.joins.detectChildrenRecords(primaryKeyColumnName, parentResults);
    } catch (e) {
      // Release the connection if there was an error.
      await Helpers.connection.releaseConnection(reportConnection, inputs.datastore.manager, leased);
      return exits.error(e);
    }


    //  ╦╔╗╔╦╔╦╗╦╔═╗╦  ╦╔═╗╔═╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬  ┌─┐┌─┐┌─┐┬ ┬┌─┐
    //  ║║║║║ ║ ║╠═╣║  ║╔═╝║╣   │─┼┐│ │├┤ ├┬┘└┬┘  │  ├─┤│  ├─┤├┤
    //  ╩╝╚╝╩ ╩ ╩╩ ╩╩═╝╩╚═╝╚═╝  └─┘└└─┘└─┘┴└─ ┴   └─┘┴ ┴└─┘┴ ┴└─┘
    let queryCache;
    try {
      queryCache = Helpers.query.initializeQueryCache({
        instructions: statements.instructions,
        models: inputs.models,
        sortedResults: sortedResults
      });
    } catch (e) {
      // Release the connection if there was an error.
      await Helpers.connection.releaseConnection(reportConnection, inputs.datastore.manager, leased);
      return exits.error(e);
    }


    //  ╔═╗╔╦╗╔═╗╦═╗╔═╗  ┌─┐┌─┐┬─┐┌─┐┌┐┌┌┬┐┌─┐
    //  ╚═╗ ║ ║ ║╠╦╝║╣   ├─┘├─┤├┬┘├┤ │││ │ └─┐
    //  ╚═╝ ╩ ╚═╝╩╚═╚═╝  ┴  ┴ ┴┴└─└─┘┘└┘ ┴ └─┘
    try {
      queryCache.setParents(sortedResults.parents);
    } catch (e) {
      // Release the connection if there was an error.
      await Helpers.connection.releaseConnection(reportConnection, inputs.datastore.manager, leased);
      return exits.error(e);
    }


    //  ╔═╗╦ ╦╔═╗╔═╗╦╔═  ┌─┐┌─┐┬─┐  ┌─┐┬ ┬┬┬  ┌┬┐┬─┐┌─┐┌┐┌
    //  ║  ╠═╣║╣ ║  ╠╩╗  ├┤ │ │├┬┘  │  ├─┤││   ││├┬┘├┤ │││
    //  ╚═╝╩ ╩╚═╝╚═╝╩ ╩  └  └─┘┴└─  └─┘┴ ┴┴┴─┘─┴┘┴└─└─┘┘└┘
    //  ┌─┐ ┬ ┬┌─┐┬─┐┬┌─┐┌─┐
    //  │─┼┐│ │├┤ ├┬┘│├┤ └─┐
    //  └─┘└└─┘└─┘┴└─┴└─┘└─┘
    // Now that all the parents are found, check if there are any child
    // statements that need to be processed. If not, close the connection and
    // return the combined results.
    if (!statements.childStatements || !statements.childStatements.length) {
      await Helpers.connection.releaseConnection(reportConnection, inputs.datastore.manager, leased);
      // Combine records in the cache to form nested results
      let combinedResults;
      try {
        combinedResults = queryCache.combineRecords();
      } catch (e) {
        return exits.error(e);
      }

      // Process each record to normalize output
      try {
        Helpers.query.processEachRecord({
          records: combinedResults,
          identity: model.identity,
          orm: orm
        });
      } catch (e) {
        return exits.error(e);
      }
      // Return the combined results
      return exits.success(combinedResults);
    }


    //  ╔═╗╔═╗╦  ╦  ╔═╗╔═╗╔╦╗  ┌─┐┌─┐┬─┐┌─┐┌┐┌┌┬┐
    //  ║  ║ ║║  ║  ║╣ ║   ║   ├─┘├─┤├┬┘├┤ │││ │
    //  ╚═╝╚═╝╩═╝╩═╝╚═╝╚═╝ ╩   ┴  ┴ ┴┴└─└─┘┘└┘ ┴
    //  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐┌─┐
    //  ├┬┘├┤ │  │ │├┬┘ ││└─┐
    //  ┴└─└─┘└─┘└─┘┴└──┴┘└─┘
    // There is more work to be done now. Go through the parent records and
    // build up an array of the primary keys.
    let parentKeys = _.map(queryCache.getParents(), function pluckPk(record) {
      return record[primaryKeyColumnName];
    });


    //  ╔═╗╦═╗╔═╗╔═╗╔═╗╔═╗╔═╗  ┌─┐┬ ┬┬┬  ┌┬┐  ┌─┐┌┬┐┌─┐┌┬┐┌─┐┌┬┐┌─┐┌┐┌┌┬┐┌─┐
    //  ╠═╝╠╦╝║ ║║  ║╣ ╚═╗╚═╗  │  ├─┤││   ││  └─┐ │ ├─┤ │ ├┤ │││├┤ │││ │ └─┐
    //  ╩  ╩╚═╚═╝╚═╝╚═╝╚═╝╚═╝  └─┘┴ ┴┴┴─┘─┴┘  └─┘ ┴ ┴ ┴ ┴ └─┘┴ ┴└─┘┘└┘ ┴ └─┘
    // For each child statement, figure out how to turn the statement into
    // a native query and then run it. Add the results to the query cache.
    async.each(statements.childStatements, async function processChildStatements(template, next) {
      //  ╦═╗╔═╗╔╗╔╔╦╗╔═╗╦═╗  ┬┌┐┌  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
      //  ╠╦╝║╣ ║║║ ║║║╣ ╠╦╝  ││││  │─┼┐│ │├┤ ├┬┘└┬┘
      //  ╩╚═╚═╝╝╚╝═╩╝╚═╝╩╚═  ┴┘└┘  └─┘└└─┘└─┘┴└─ ┴
      //  ┌┬┐┌─┐┌┬┐┌─┐┬  ┌─┐┌┬┐┌─┐
      //   │ ├┤ │││├─┘│  ├─┤ │ ├┤
      //   ┴ └─┘┴ ┴┴  ┴─┘┴ ┴ ┴ └─┘
      // If the statement is an IN query, replace the values with the parent
      // keys.
      if (template.queryType === 'in') {
        // Pull the last AND clause out - it's the one we added
        let inClause = _.pullAt(template.statement.where.and, template.statement.where.and.length - 1);

        // Grab the object inside the array that comes back
        inClause = _.first(inClause);

        // Modify the inClause using the actual parent key values
        _.each(inClause, function modifyInClause(val) {
          val.in = parentKeys;
        });

        // Reset the statement
        template.statement.where.and.push(inClause);
      }


      //  ╦═╗╔═╗╔╗╔╔╦╗╔═╗╦═╗  ┬ ┬┌┐┌┬┌─┐┌┐┌  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
      //  ╠╦╝║╣ ║║║ ║║║╣ ╠╦╝  │ ││││││ ││││  │─┼┐│ │├┤ ├┬┘└┬┘
      //  ╩╚═╚═╝╝╚╝═╩╝╚═╝╩╚═  └─┘┘└┘┴└─┘┘└┘  └─┘└└─┘└─┘┴└─ ┴
      //  ┌┬┐┌─┐┌┬┐┌─┐┬  ┌─┐┌┬┐┌─┐
      //   │ ├┤ │││├─┘│  ├─┤ │ ├┤
      //   ┴ └─┘┴ ┴┴  ┴─┘┴ ┴ ┴ └─┘
      // If the statement is a UNION type, loop through each parent key and
      // build up a proper query.
      if (template.queryType === 'union') {
        let unionStatements = [];

        // Build up an array of generated statements
        _.each(parentKeys, function buildUnion(parentPk) {
          let unionStatement = _.merge({}, template.statement);

          // Replace the placeholder `?` values with the primary key of the
          // parent record.
          let andClause = _.pullAt(unionStatement.where.and, unionStatement.where.and.length - 1);
          _.each(_.first(andClause), function replaceValue(val, key) {
            _.first(andClause)[key] = parentPk;
          });

          // Add the UNION statement to the array of other statements
          unionStatement.where.and.push(_.first(andClause));
          unionStatements.push(unionStatement);
        });

        // Replace the final statement with the UNION ALL clause
        if (unionStatements.length) {
          template.statement = {unionAll: unionStatements};
        }
      }

      // If there isn't a statement to be run, then just return
      if (!template.statement) {
        return next();
      }


      //  ╔═╗╔═╗╔╦╗╔═╗╦╦  ╔═╗  ┌─┐┌┬┐┌─┐┌┬┐┌─┐┌┬┐┌─┐┌┐┌┌┬┐
      //  ║  ║ ║║║║╠═╝║║  ║╣   └─┐ │ ├─┤ │ ├┤ │││├┤ │││ │
      //  ╚═╝╚═╝╩ ╩╩  ╩╩═╝╚═╝  └─┘ ┴ ┴ ┴ ┴ └─┘┴ ┴└─┘┘└┘ ┴
      // Attempt to convert the statement into a native query
      let compiledQuery = await Helpers.query.compileStatement(template.statement, meta).catch(e => {
        return next(e);
      });


      //  ╦═╗╦ ╦╔╗╔  ┌─┐┬ ┬┬┬  ┌┬┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
      //  ╠╦╝║ ║║║║  │  ├─┤││   ││  │─┼┐│ │├┤ ├┬┘└┬┘
      //  ╩╚═╚═╝╝╚╝  └─┘┴ ┴┴┴─┘─┴┘  └─┘└└─┘└─┘┴└─ ┴
      // Run the native query
      let columns = Object.keys(template.statement.where);
      if (template.statement.where.and) {
        columns = [];
        for (const column of template.statement.where.and) {
          columns.push(Object.keys(column)[0]);
        }
      }
      const queryResults = await Helpers.query.runNativeQuery(reportConnection, inputs.datastore.manager, compiledQuery.nativeQuery,
          compiledQuery.valuesToEscape, {columns: columns, tableName: template.statement.from}, compiledQuery.meta).catch(err => {
        return next(err);
      });
        // Extend the values in the cache to include the values from the
        // child query.
      queryCache.extend(queryResults, template.instructions);

      return next();
    },
      async function asyncEachCb(err) {
        // Always release the connection unless a leased connection from outside
        // the adapter was used.
        await Helpers.connection.releaseConnection(reportConnection, inputs.datastore.manager, leased);
        if (err) {
          return exits.error(err);
        }

        // Combine records in the cache to form nested results
        let combinedResults = queryCache.combineRecords();

        // Process each record to normalize output
        try {
          Helpers.query.processEachRecord({
            records: combinedResults,
            identity: model.identity,
            orm: orm
          });
        } catch (e) {
          return exits.error(e);
        }

        // Return the combined results
        return exits.success(combinedResults);
      }); // </ spawnConnection >
  }
});

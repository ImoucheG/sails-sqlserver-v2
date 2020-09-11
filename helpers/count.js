//   ██████╗ ██████╗ ██╗   ██╗███╗   ██╗████████╗     █████╗  ██████╗████████╗██╗ ██████╗ ███╗   ██╗
//  ██╔════╝██╔═══██╗██║   ██║████╗  ██║╚══██╔══╝    ██╔══██╗██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║
//  ██║     ██║   ██║██║   ██║██╔██╗ ██║   ██║       ███████║██║        ██║   ██║██║   ██║██╔██╗ ██║
//  ██║     ██║   ██║██║   ██║██║╚██╗██║   ██║       ██╔══██║██║        ██║   ██║██║   ██║██║╚██╗██║
//  ╚██████╗╚██████╔╝╚██████╔╝██║ ╚████║   ██║       ██║  ██║╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║
//   ╚═════╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝   ╚═╝       ╚═╝  ╚═╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
//

module.exports = require('machine').build({
  friendlyName: 'Count',
  description: 'Return the count of the records matched by the query.',
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
      description: 'The results of the count query.',
      outputExample: '==='
    },
    invalidDatastore: {
      description: 'The datastore used is invalid. It is missing key pieces.'
    },
    badConnection: {
      friendlyName: 'Bad connection',
      description: 'A connection either could not be obtained or there was an error using the connection.'
    }
  },
  fn: async function count(inputs, exits) {
    // Dependencies
    const _ = require('@sailshq/lodash');
    const Converter = require('waterline-utils').query.converter;
    const Helpers = require('./private');


    // Store the Query input for easier access
    let query = inputs.query;
    query.meta = query.meta || {};


    // Find the model definition
    let model = inputs.models[query.using];
    if (!model) {
      return exits.invalidDatastore();
    }


    // Set a flag if a leased connection from outside the adapter was used or not.
    var leased = _.has(query.meta, 'leasedConnection');


    //  ╔═╗╔═╗╔╗╔╦  ╦╔═╗╦═╗╔╦╗  ┌┬┐┌─┐  ┌─┐┌┬┐┌─┐┌┬┐┌─┐┌┬┐┌─┐┌┐┌┌┬┐
    //  ║  ║ ║║║║╚╗╔╝║╣ ╠╦╝ ║    │ │ │  └─┐ │ ├─┤ │ ├┤ │││├┤ │││ │
    //  ╚═╝╚═╝╝╚╝ ╚╝ ╚═╝╩╚═ ╩    ┴ └─┘  └─┘ ┴ ┴ ┴ ┴ └─┘┴ ┴└─┘┘└┘ ┴
    // Convert the Waterline criteria into a Waterline Query Statement. This
    // turns it into something that is declarative and can be easily used to
    // build a SQL query.
    // See: https://github.com/treelinehq/waterline-query-docs for more info
    // on Waterline Query Statements.
    let statement;
    try {
      statement = Converter({
        model: query.using,
        method: 'count',
        criteria: query.criteria
      });
    } catch (e) {
      return exits.error(e);
    }

    let compiledQuery = await Helpers.query.compileStatement(statement).catch(err => {
      return exits.error(err);
    });

    //  ╔═╗╔═╗╔═╗╦ ╦╔╗╔  ┌─┐┌─┐┌┐┌┌┐┌┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
    //  ╚═╗╠═╝╠═╣║║║║║║  │  │ │││││││├┤ │   │ ││ ││││
    //  ╚═╝╩  ╩ ╩╚╩╝╝╚╝  └─┘└─┘┘└┘┘└┘└─┘└─┘ ┴ ┴└─┘┘└┘
    //  ┌─┐┬─┐  ┬ ┬┌─┐┌─┐  ┬  ┌─┐┌─┐┌─┐┌─┐┌┬┐  ┌─┐┌─┐┌┐┌┌┐┌┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
    //  │ │├┬┘  │ │└─┐├┤   │  ├┤ ├─┤└─┐├┤  ││  │  │ │││││││├┤ │   │ ││ ││││
    //  └─┘┴└─  └─┘└─┘└─┘  ┴─┘└─┘┴ ┴└─┘└─┘─┴┘  └─┘└─┘┘└┘┘└┘└─┘└─┘ ┴ ┴└─┘┘└┘
    // Spawn a new connection for running queries on.
    const reportConnection = await Helpers.connection.spawnOrLeaseConnection(inputs.datastore, query.meta).catch(err => {
      return exits.badConnection(err);
    });
    //  ╦═╗╦ ╦╔╗╔  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ╠╦╝║ ║║║║  │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╩╚═╚═╝╝╚╝  └─┘└└─┘└─┘┴└─ ┴
    let queryType = 'count';

    let columns = [];
    for (const column of Object.keys(statement.where)) {
      if ((statement.where[column] && statement.where[column].in) || column === 'and') {
        const toIterate = statement.where[column].in ? statement.where[column].in : statement.where[column];
        for (const value of toIterate) {
          if (typeof value === 'object') {
            for (const key in value) {
              if (value[key] && value[key].in) {
                for (const inItem of value[key].in) {
                  columns.push(key);
                }
              } else {
                columns.push(key);
              }
            }
          } else {
            columns.push(column);
          }
        }
      } else {
        columns.push(column);
      }
    }
    const report = await Helpers.query.runQuery({
      connection: reportConnection,
      statement: {columns: columns, tableName: statement.from},
      nativeQuery: compiledQuery.nativeQuery,
      valuesToEscape: compiledQuery.valuesToEscape,
      meta: compiledQuery.meta,
      queryType: queryType,
      disconnectOnError: !leased
    }, inputs.datastore.manager).catch(err => {
      // The runQuery helper will automatically release the connection on error
      // if needed.
      return exits.error(err);
    });

    // Always release the connection unless a leased connection from outside
    // the adapter was used.
    await Helpers.connection.releaseConnection(reportConnection, inputs.datastore.manager, leased);
    return exits.success(report.result);
  }
});

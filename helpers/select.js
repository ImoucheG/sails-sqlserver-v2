//  ███████╗███████╗██╗     ███████╗ ██████╗████████╗     █████╗  ██████╗████████╗██╗ ██████╗ ███╗   ██╗
//  ██╔════╝██╔════╝██║     ██╔════╝██╔════╝╚══██╔══╝    ██╔══██╗██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║
//  ███████╗█████╗  ██║     █████╗  ██║        ██║       ███████║██║        ██║   ██║██║   ██║██╔██╗ ██║
//  ╚════██║██╔══╝  ██║     ██╔══╝  ██║        ██║       ██╔══██║██║        ██║   ██║██║   ██║██║╚██╗██║
//  ███████║███████╗███████╗███████╗╚██████╗   ██║       ██║  ██║╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║
//  ╚══════╝╚══════╝╚══════╝╚══════╝ ╚═════╝   ╚═╝       ╚═╝  ╚═╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
//

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
    }
  },
  fn: async function select(inputs, exits) {
    // Dependencies
    const _ = require('@sailshq/lodash');
    const WLUtils = require('waterline-utils');
    const Converter = WLUtils.query.converter;
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
    let leased = _.has(query.meta, 'leasedConnection');


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
        method: 'find',
        criteria: query.criteria
      });
    } catch (e) {
      return exits.error(e);
    }


    // Compile the original Waterline Query
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

    //  ╦═╗╦ ╦╔╗╔  ┌─┐┌─┐┬  ┌─┐┌─┐┌┬┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ╠╦╝║ ║║║║  └─┐├┤ │  ├┤ │   │   │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╩╚═╚═╝╝╚╝  └─┘└─┘┴─┘└─┘└─┘ ┴   └─┘└└─┘└─┘┴└─ ┴
    let queryType = 'select';

    let columns = [];
    for (const column of Object.keys(statement.where)) {
      if (statement.where[column] && statement.where[column].in) {
        for (const value of statement.where[column].in) {
          columns.push(column);
        }
      } else {
        columns.push(column);
      }
    }
    if (statement.where.and) {
      columns = [];
      for (const column of statement.where.and) {
        if (Object.keys(column)[0] === 'or') {
          for (const columnOr of column.or) {
            columns.push(Object.keys(columnOr)[0]);
            if (Object.keys(columnOr)[0].in) {
              for (const value of Object.keys(columnOr)[0].in) {
                columns.push(Object.keys(columnOr)[0]);
              }
            } else {
              columns.push(Object.keys(columnOr)[0]);
            }
          }
        } else {
          if (Object.keys(column)[0].in) {
            for (const value of Object.keys(column)[0].in) {
              columns.push(column);
            }
          } else {
            columns.push(Object.keys(column)[0]);
          }
        }
      }
    }
    const report = await Helpers.query.runQuery({
      connection: reportConnection,
      nativeQuery: compiledQuery.nativeQuery,
      valuesToEscape: compiledQuery.valuesToEscape,
      meta: compiledQuery.meta,
      queryType: queryType,
      statement: {columns: columns, tableName: statement.from},
      disconnectOnError: !leased
    }, inputs.datastore.manager).catch(err => {
      return exits.error(err);
    });

    // Always release the connection unless a leased connection from outside
    // the adapter was used.
    await Helpers.connection.releaseConnection(reportConnection, inputs.datastore.manager, leased);
    let selectRecords = report.result;
    let orm = {
      collections: inputs.models
    };

    // Process each record to normalize output
    try {
      Helpers.query.processEachRecord({
        records: selectRecords,
        identity: model.identity,
        orm: orm
      });
    } catch (e) {
      return exits.error(e);
    }
    return exits.success({records: selectRecords});
  }
});

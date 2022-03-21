module.exports = require('machine').build({
  friendlyName: 'Describe',
  description: 'Describe a table in the related data store.',
  inputs: {
    datastore: {
      description: 'The datastore to use for connections.',
      extendedDescription: 'Datastores represent the config and manager required to obtain an active database connection.',
      required: true,
      example: '==='
    },
    tableName: {
      description: 'The name of the table to describe.',
      required: true,
      example: 'users'
    },
    meta: {
      friendlyName: 'Meta (custom)',
      description: 'Additional stuff to pass to the driver.',
      extendedDescription: 'This is reserved for custom driver-specific extensions.',
      example: '==='
    }
  },
  exits: {
    success: {
      description: 'The results of the describe query.',
      outputVariableName: 'records',
      outputType: 'ref'
    },
    badConnection: {
      friendlyName: 'Bad connection',
      description: 'A connection either could not be obtained or there was an error using the connection.'
    }
  },


  fn: function describe(inputs, exits) {
    // TODO: IMPLEMENTS
    return exits.success();
  }
});

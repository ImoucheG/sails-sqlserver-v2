module.exports = require('machine').build({
  friendlyName: 'Drop',
  description: 'Remove a table from the database.',
  inputs: {
    datastore: {
      description: 'The datastore to use for connections.',
      extendedDescription: 'Datastores represent the config and manager required to obtain an active database connection.',
      required: true,
      example: '==='
    },
    tableName: {
      description: 'The name of the table to destroy.',
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
      description: 'The table was destroyed successfully.'
    },
    badConnection: {
      friendlyName: 'Bad connection',
      description: 'A connection either could not be obtained or there was an error using the connection.'
    }
  },
  fn: function drop(inputs, exits) {
    // TODO: IMPLEMENTS
    return exits.success();
  }
});

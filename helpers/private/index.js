module.exports = {
  // Helpers for handling connections
  connection: {
    createManager: require('./connection/create-manager'),
    destroyManager: require('./connection/destroy-manager'),
    spawnPool: require('./connection/spawn-pool'),
    releaseConnection: require('./connection/release-connection')
  },

  // Helpers for handling query logic
  query: {
    create: require('./query/create'),
    createEach: require('./query/create-each'),
    compileStatement: require('./query/compile-statement'),
    destroy: require('./query/destroy'),
    initializeQueryCache: require('./query/initialize-query-cache'),
    processEachRecord: require('./query/process-each-record'),
    preProcessRecord: require('./query/pre-process-record'),
    runNativeQuery: require('./query/run-native-query'),
    runQuery: require('./query/run-query'),
    getColumns: require('./query/get-columns'),
    update: require('./query/update')
  },

  // Helpers for dealing with underlying database schema
  schema: {
    buildIndexes: require('./schema/build-indexes'),
    buildSchema: require('./schema/build-schema'),
    escapeTableName: require('./schema/escape-table-name')
  },
  // Helpers utils
  utils: {
    getColumnBraced: require('./utils/get-column-braced'),
    checkIfPreparedParameter: require('./utils/check-if-prepared-parameter'),
    getEditsColumns: require('./utils/get-edits-columns'),
    getFindColumns: require('./utils/get-find-columns'),
    getColumnsToIterate: require('./utils/get-columns-to-iterate'),
    constructColumnsCriteriaArray: require('./utils/construct-columns-criteria-array'),
    appendColumnCriteria: require('./utils/append-column-criteria'),
    getPreparedColumns: require('./utils/get-prepared-columns'),
    getStringParameterSection: require('./utils/get-string-parameter-section'),
  }
};

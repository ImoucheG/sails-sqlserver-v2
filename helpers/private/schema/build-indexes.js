const _ = require('@sailshq/lodash');
const async = require('async');
const escapeTableName = require('./escape-table-name');
const runNativeQuery = require('../query/run-native-query');
module.exports = async function buildIndexes(options) {
  if (_.isUndefined(options) || !_.isPlainObject(options)) {
    return Promise.reject(new Error('Invalid options argument. Options must contain: connection, definition, and tableName.'));
  }

  if (!_.has(options, 'connection') || !_.isObject(options.connection)) {
    return Promise.reject(new Error('Invalid option used in options argument. Missing or invalid connection.'));
  }

  if (!_.has(options, 'definition') || !_.isPlainObject(options.definition)) {
    return Promise.reject(new Error('Invalid option used in options argument. Missing or invalid definition.'));
  }

  if (!_.has(options, 'tableName') || !_.isString(options.tableName)) {
    return Promise.reject(new Error('Invalid option used in options argument. Missing or invalid tableName.'));
  }
  const indexes = _.reduce(options.definition, function reduce(meta, val, key) {
    if (_.has(val, 'index')) {
      meta.push(key);
    }
    return meta;
  }, []);

  async.eachSeries(indexes, async function build(name, nextIndex) {
    const cleanTable = options.tableName.replace(/['"]/g, '');
    const query = 'CREATE INDEX ' + escapeTableName(cleanTable + '_' + name) + ' on ' + options.tableName + ' (' + escapeTableName(name) + ');';
    await runNativeQuery(options.connection, query, [], undefined, nextIndex);
  }, Promise.resolve);
};

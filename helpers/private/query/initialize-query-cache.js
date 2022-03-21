const _ = require('@sailshq/lodash');
const utils = require('waterline-utils');
module.exports = function initializeQueryCache(options) {
  if (_.isUndefined(options) || !_.isPlainObject(options)) {
    throw new Error('Invalid options argument. Options must contain: connection, query, model, schemaName, and tableName.');
  }
  if (!_.has(options, 'instructions') || !_.isPlainObject(options.instructions)) {
    throw new Error('Invalid option used in options argument. Missing or invalid instructions.');
  }
  if (!_.has(options, 'models') || !_.isPlainObject(options.models)) {
    throw new Error('Invalid option used in options argument. Missing or invalid models.');
  }
  if (!_.has(options, 'sortedResults') || !_.isPlainObject(options.sortedResults)) {
    throw new Error('Invalid option used in options argument. Missing or invalid sortedResults.');
  }
  const queryCache = utils.joins.queryCache();
  _.each(options.instructions, function processInstruction(val, key) {
    const popInstructions = val.instructions;
    const strategy = val.strategy.strategy;
    const model = options.models[_.first(popInstructions).parent];
    if (!model) {
      throw new Error('Invalid parent table name used when caching query results. Perhaps the join criteria is invalid?');
    }
    const pkAttr = model.primaryKey;
    const pkColumnName = model.definition[pkAttr].columnName || pkAttr;
    let alias;
    let keyName;
    if (val.strategy && val.strategy.strategy === 1) {
      alias = _.first(popInstructions).alias;
      keyName = _.first(popInstructions).parentKey;
    } else {
      alias = _.first(popInstructions).alias;
    }
    _.each(options.sortedResults.parents, function buildAliasCache(parentRecord) {
      const cache = {
        attrName: key,
        parentPkAttr: pkColumnName,
        belongsToPkValue: parentRecord[pkColumnName],
        keyName: keyName || alias,
        type: strategy
      };

      const childKey = _.first(popInstructions).childKey;
      const parentKey = _.first(popInstructions).parentKey;

      const records = _.filter(options.sortedResults.children[alias], function findChildren(child) {
        if (strategy === 3) {
          return child._parent_fk === parentRecord[parentKey];
        }
        return child[childKey] === parentRecord[parentKey];
      });

      if (strategy === 3) {
        _.each(records, function cleanRecords(record) {
          delete record._parent_fk;
        });
      }

      if (records.length) {
        cache.records = records;
      }

      queryCache.set(cache);
    });
  });
  return queryCache;
};

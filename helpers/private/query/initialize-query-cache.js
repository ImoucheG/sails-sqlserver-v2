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
  Object.keys(options.instructions).forEach((key) => {
    const val = options.instructions[key];
    const popInstructions = val.instructions;
    const strategy = val.strategy.strategy;
    const model = options.models[popInstructions[0].parent];


    if (!model) {
      throw new Error('Invalid parent table name used when caching query results. Perhaps the join criteria is invalid?');
    }
    const pkAttr = model.primaryKey;
    const pkColumnName = model.definition[pkAttr].columnName || pkAttr;
    let alias;
    let keyName;
    if (val.strategy && val.strategy.strategy === 1) {
      alias = popInstructions[0].alias;
      keyName = popInstructions[0].parentKey;
    } else {
      alias = popInstructions[0].alias;
    }
    let items = [];
    if (options.sortedResults.children[alias] && Array.isArray(options.sortedResults.children[alias])) {
      // eslint-disable-next-line no-undef
      const uniq = new Set(options.sortedResults.children[alias].map(e => JSON.stringify(e)));
      items = Array.from(uniq).map(e => JSON.parse(e));
    }
    let itemsParents = [];
    if (options.sortedResults.parents && Array.isArray(options.sortedResults.parents)) {
      // eslint-disable-next-line no-undef
      const uniqParents = new Set(options.sortedResults.parents.map(e => JSON.stringify(e)));
      itemsParents = Array.from(uniqParents).map(e => JSON.parse(e));
    }

    itemsParents.forEach((parentRecord) => {
      const cache = {
        attrName: key,
        parentPkAttr: pkColumnName,
        belongsToPkValue: parentRecord[pkColumnName],
        keyName: keyName || alias,
        type: strategy
      };

      const childKey = popInstructions[0].childKey;
      const parentKey = popInstructions[0].parentKey;
      const records = items.filter((child) => {
        if (strategy === 3) {
          return child._parent_fk === parentRecord[parentKey];
        }
        return child[childKey] === parentRecord[parentKey];
      });

      if (strategy === 3) {
        records.forEach((record) => {
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

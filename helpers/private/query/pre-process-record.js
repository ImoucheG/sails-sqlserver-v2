const _ = require('@sailshq/lodash');
const utils = require('waterline-utils');
const eachRecordDeep = utils.eachRecordDeep;
module.exports = function preProcessRecord(options) {
  if (_.isUndefined(options) || !_.isPlainObject(options)) {
    throw new Error('Invalid options argument. Options must contain: records, identity, and orm.');
  }

  if (!_.has(options, 'records') || !_.isArray(options.records)) {
    throw new Error('Invalid option used in options argument. Missing or invalid records.');
  }

  if (!_.has(options, 'identity') || !_.isString(options.identity)) {
    throw new Error('Invalid option used in options argument. Missing or invalid identity.');
  }

  if (!_.has(options, 'orm') || !_.isPlainObject(options.orm)) {
    throw new Error('Invalid option used in options argument. Missing or invalid orm.');
  }


  options.orm.collections =  _.reduce(options.orm.collections, function (memo, val) {
    memo[val.identity] = val;
    return memo;
  }, {});
  eachRecordDeep(options.records, function iterator(record, WLModel, depth) {
    if (depth !== 1) {
      throw new Error('Consistency violation: Incoming new records in a s3q should never necessitate deep iteration!  If you are seeing this error, it is probably because of a bug in this adapter, or in Waterline core.');
    }

    _.each(WLModel.definition, function checkAttributes(attrDef) {
      const columnName = attrDef.columnName;
      if (attrDef.type === 'json' && _.has(record, columnName)) {
        if (!_.isNull(record[columnName])) {
          record[columnName] = JSON.stringify(record[columnName]);
        }
      }
    });
  }, true, options.identity, options.orm);
};

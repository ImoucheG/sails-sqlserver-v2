const _ = require('@sailshq/lodash');
module.exports = function buildSchema(definition) {
  if (!definition) {
    throw new Error('Build Schema requires a valid definition.');
  }
  // TODO: move this code inline to eliminate unnecessary function declaration
  const normalizeType = function normalizeType(type) {
    switch (type.toLowerCase()) {
      case '_number':
        return 'REAL';
      case '_numberkey':
        return 'INTEGER';
      case '_numbertimestamp':
        return 'BIGINT';
      case '_string':
        return 'VARCHAR(255)';
      case '_stringkey':
        return 'VARCHAR(255)';
      case '_stringtimestamp':
        return 'VARCHAR(255)';
      case '_boolean':
        return 'BOOLEAN';
      case '_json':
        return 'LONGTEXT';
      case '_ref':
        return 'LONGTEXT';
      case 'varchar':
        return 'VARCHAR(255)';
      default:
        return type;
    }
  };
  const columns = _.map(definition, function map(attribute, name) {
    if (_.isString(attribute)) {
      const val = attribute;
      attribute = {};
      attribute.type = val;
    }

    const type = normalizeType(attribute.columnType);
    const nullable = attribute.notNull && 'NOT NULL';
    const unique = attribute.unique && 'UNIQUE';
    const autoIncrement = attribute.autoIncrement && 'AUTO_INCREMENT';

    return _.compact(['`' + name + '`', type, nullable, unique, autoIncrement]).join(' ');
  }).join(',');

  const primaryKeys = _.keys(_.pick(definition, function findPK(attribute) {
    return attribute.primaryKey;
  }));

  const constraints = _.compact([
    primaryKeys.length && 'PRIMARY KEY (' + primaryKeys.join(',') + ')'
  ]).join(', ');
  return  _.compact([columns, constraints]).join(', ');
};

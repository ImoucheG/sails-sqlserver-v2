module.exports = function escapeTableName(name) {
  name = '`' + name + '`';
  return name;
};

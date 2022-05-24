module.exports = async function getColumns(statement, compiledQuery, type = 'select', cb = null) {
  try {
    const Helpers = require('sails-sqlserver-v2/helpers/private');
    let columnsToReturn = [];
    switch (type) {
      case 'select':
        columnsToReturn = await Helpers.utils.getFindColumns(statement, compiledQuery);
        break;
      case 'sum':
        columnsToReturn = await Helpers.utils.getFindColumns(statement, compiledQuery);
        break;
      case 'destroy':
        columnsToReturn = await Helpers.utils.getFindColumns(statement, compiledQuery);
        break;
      case 'insert':
        columnsToReturn = await Helpers.utils.getEditsColumns(statement, compiledQuery);
        break;
      case 'update':
        columnsToReturn = await Helpers.utils.getEditsColumns(statement, compiledQuery);
        break;
    }
    return cb(undefined, columnsToReturn);
  } catch (err) {
    return cb(err);
  }
};

module.exports = async function getEditsColumns(statement, compiledQuery) {
  try {
    let columnsToReturn = [];
    const Helpers = require('sails-sqlserver-v2/helpers/private');
    // If SUM
    if (!statement.where && statement.from.where) {
      statement.where = statement.from.where;
    }
    const whereKeys = Object.keys(statement.where);
    if (whereKeys.length > 0) {
      for (const column of whereKeys) {
        const columnElement = statement.where[column];
        // Convert table.column to [table].[column]
        const columnsToAdd = await Helpers.utils.getColumnsToIterate(columnElement);
        if (columnsToAdd.isContain && columnsToAdd.toIterate) {
          for (let value of columnsToAdd.toIterate) {
            const columnsValue = await Helpers.utils.constructColumnsCriteriaArray(value, column);
            columnsToReturn = await Helpers.utils
              .getPreparedColumns(column, columnsValue,
                columnsToReturn, true);
          }
        } else {
          // Not IN or AND
          columnsToReturn = await Helpers.utils
            .getPreparedColumns(column, null,
              columnsToReturn, false, compiledQuery.nativeQuery);
        }
      }
    }
    return Promise.resolve(columnsToReturn);
  } catch (err) {
    console.error(err);
    return Promise.reject(err);
  }
};

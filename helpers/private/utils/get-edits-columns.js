module.exports = async function getEditsColumns(statement) {
  try {
    let columnsToReturn = [];
    const columns = (statement.insert ? statement.insert : statement.update);
    if (columns && !columns.length) {
      columnsToReturn = Object.keys(columns);
    }
    if (columns.length && columns.length > 0) {
      for (const col of columns) {
        columnsToReturn = columnsToReturn.concat(Object.keys(col).sort());
      }
    }
    if (statement.insert) {
      columnsToReturn = columnsToReturn.sort();
    }
    return Promise.resolve(columnsToReturn);
  } catch (err) {
    return Promise.reject(err);
  }
};

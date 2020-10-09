module.exports = async function getStringParameterSection(compiledQuery, columnCriteria, columnsPassed) {
  try {
    let startIndex = 0;
    let endIndex = 0;
    let sql = compiledQuery.nativeQuery;
    sql = sql.substr((sql.toLowerCase().indexOf('where')), (sql.length - (sql.toLowerCase().indexOf('where'))));
    const key = Object.keys(columnCriteria)[0];
    const columnPassed = columnsPassed.filter(el => el.columnName === key);
    if (columnPassed && columnPassed.length > 0) {
      columnsPassed = columnsPassed.sort((a,b) => b.lastIndex - a.lastIndex);
      startIndex = columnPassed[0].lastIndex;
    }
    if (columnsPassed || columnsPassed.length  === 0) {
      startIndex = sql.indexOf(key);
      if (startIndex > -1) {
        endIndex = sql.length - startIndex;
        sql = sql.substr(startIndex, endIndex);
        endIndex = sql.indexOf(key, (startIndex + key.length));
        if (endIndex === -1) {
          endIndex = sql.length;
        }
        sql = sql.substr(0, endIndex);
        columnsPassed.push({columnName: key, lastIndex: (startIndex + key.length)});
      }
    }
    return Promise.resolve({columnsPassed, sql});
  } catch (err) {
    console.error(err);
    return Promise.reject(err);
  }
};

module.exports = async function getColumnBraced(column) {
  try {
    let columnsBraced = '';
    const splitColumn = column.split('.');
    let indexColumnBraced = 0;
    for (const key of splitColumn) {
      if (indexColumnBraced > 0) {
        columnsBraced += '.';
      }
      columnsBraced += '[' + key + ']';
      indexColumnBraced++;
    }
    return Promise.resolve(columnsBraced);
  } catch (err) {
    return Promise.reject(err);
  }
};

module.exports = async function getPreparedColumns(column, columnsValue, columnsToReturn, isArray, nativeQuery = null) {
  try {
    const Helpers = require('sails-sqlserver-v2/helpers/private');
    if (isArray) {
      if (typeof columnsValue === 'object' && columnsValue.length > 0) {
        for (const columnCriteria of columnsValue) {
          let columnToIterate = columnCriteria;
          const key = Object.keys(columnToIterate)[0];
          if (typeof columnToIterate[key] === 'object' && columnToIterate[key]) {
            columnToIterate = columnToIterate[key];
          }
          if (columnToIterate && (columnToIterate.in || columnToIterate.nin)) {
            for (const inItem of (columnToIterate.in ? columnToIterate.in : columnToIterate.nin)) {
              columnsToReturn.push(key);
            }
          } else {
            if (await Helpers.utils
              .checkIfPreparedParameter(columnToIterate)) {
              columnsToReturn.push(key);
            }
          }
        }
      } else {
        if (await Helpers.utils
          .checkIfPreparedParameter(column, nativeQuery)) {
          columnsToReturn.push(column);
        }
      }
    } else {
      if (await Helpers.utils
        .checkIfPreparedParameter(column, nativeQuery)) {
        columnsToReturn.push(column);
      }
    }
    return Promise.resolve(columnsToReturn);
  } catch (err) {
    return Promise.reject(err);
  }
};

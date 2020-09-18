module.exports = async function getColumns(statement, compiledQuery, type = 'select') {
  try {
    const checkIfParameter = (columnName) => {
      return (!compiledQuery.nativeQuery.toLowerCase().includes(columnName.toLowerCase() + ' is null')
        && !compiledQuery.nativeQuery.toLowerCase().includes(columnName.toLowerCase() + ' is not null'));
    };
    const Helpers = require('../../private');
    let columnsToReturn = [];

    if (type === 'select' || type === 'destroy' || type === 'sum') {
      // If SUM
      if (!statement.where && statement.from.where) {
        statement.where = statement.from.where;
      }
      const whereKeys = Object.keys(statement.where);
      if (whereKeys.length > 0) {
        for (const column of whereKeys) {
          const columnElement = statement.where[column];
          // Convert table.column to [table].[column]
          let columnsBraced = await Helpers.utils.getColumnBraced(column);
          // If And
          if ((columnElement && (columnElement.in || columnElement.nin)) || (typeof columnElement === 'object' && columnElement && columnElement.length > 0)) {
            // use In array or diretely the element
            const toIterate = columnElement.in ? columnElement.in : columnElement.nin ? columnElement.nin : columnElement;
            for (let value of toIterate) {
              const valueCriteria = Object.keys(value)[0];
              if (value && typeof value === 'object' && (valueCriteria === 'or' || valueCriteria === 'and')) {
                const valuesToIterate = value;
                value = {};
                for (const valIteration of valuesToIterate[valueCriteria]) {
                  const valIteriationKey = Object.keys(valIteration)[0];
                  const valIteriationValue = valIteration[valIteriationKey];
                  if (!value[valIteriationKey]) {
                    if (valuesToIterate[valueCriteria].length > 1) {
                      value[valIteriationKey] = {in: []};
                    } else {
                      value[valIteriationKey] = null;
                    }
                  }
                  if (valuesToIterate[valueCriteria].length > 1) {
                    value[valIteriationKey].in.push(valIteriationValue);
                  } else {
                    value[valIteriationKey] = valIteriationValue;
                  }
                }
              }
              if (typeof value === 'object') {
                for (const key in value) {
                  if (value.hasOwnProperty(key)) {
                    const valueElement = value[key];
                    columnsBraced = await Helpers.utils.getColumnBraced(key);
                    if (valueElement && (valueElement.in || valueElement.nin)) {
                      for (const inItem of (valueElement.in ? valueElement.in : valueElement.nin)) {
                        columnsToReturn.push(key);
                      }
                    } else {
                      if (checkIfParameter(columnsBraced)) {
                        columnsToReturn.push(key);
                      }
                    }
                  }
                }
              } else {
                if (checkIfParameter(columnsBraced)) {
                  columnsToReturn.push(column);
                }
              }
            }
          } else {
            // Not IN or AND
            if (checkIfParameter(columnsBraced)) {
              columnsToReturn.push(column);
            }
          }
        }
      }
    }

    if (type === 'insert' || type === 'update') {
      const columns = (statement.insert ? statement.insert : statement.update);
      if (columns && !columns.length) {
        columnsToReturn = Object.keys(columns).sort();
      }
      if (columns.length && columns.length > 0) {
        for (const col of columns) {
          columnsToReturn = columnsToReturn.concat(Object.keys(col).sort());
        }
      }
    }
    return Promise.resolve(columnsToReturn);
  } catch (err) {
    console.error(err);
    return Promise.reject(err);
  }
};

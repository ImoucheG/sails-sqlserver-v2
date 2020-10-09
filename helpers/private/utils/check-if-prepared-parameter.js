module.exports = async function checkIfPreparedParameter(columnCriteria, nativeQuery = null) {
  try {
    const Helpers = require('sails-sqlserver-v2/helpers/private');
    let correct = false;
    if (typeof columnCriteria === 'object' && columnCriteria) {
      const key = Object.keys(columnCriteria)[0];
      const value = columnCriteria && key ? columnCriteria[key] : null;
      if (value !== null || key === '!=') {
        correct = true;
      }
    } else {
      if (nativeQuery && columnCriteria) {
        const keyBraced = (await Helpers.utils.getColumnBraced(columnCriteria)).toLowerCase();
        correct = !nativeQuery.toLowerCase().includes(keyBraced + ' is null') && !nativeQuery.toLowerCase().includes(keyBraced + ' is' +
          ' not null');
      }
    }
    return Promise.resolve(correct);
  } catch (err) {
    console.error(err);
    return Promise.reject(err);
  }
};

module.exports = async function constructColumnsCriteriaArray(value, column) {
  try {
    const Helpers = require('sails-sqlserver-v2/helpers/private');
    let criteria = [];
    if (typeof value === 'object') {
      for (const valKey in value) {
        if (value && typeof value === 'object' && (valKey === 'or' || valKey === 'and')) {
          for (let valIteration of value[valKey]) {
            let valueTransform = {};
            if (['and', 'or'].includes((Object.keys(valIteration)[0]))) {
              criteria = criteria.concat((await Helpers.utils.constructColumnsCriteriaArray(valIteration)));
            } else {
              valueTransform = await Helpers.utils.appendColumnCriteria(valIteration, valueTransform);
              criteria.push(valueTransform);
            }
          }
        } else {
          criteria.push(value);
        }
      }
    } else {
      let valueCriteria = {};
      valueCriteria[column] = value;
      criteria.push(valueCriteria);
    }
    return Promise.resolve(criteria);
  } catch (err) {
    console.error(err);
    return Promise.reject(err);
  }
};

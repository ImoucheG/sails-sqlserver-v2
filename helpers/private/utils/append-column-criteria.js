module.exports = async function appendColumnCriteria(iteration, valueTransform) {
  try {
    for (const key in iteration) {
      const value = iteration.hasOwnProperty(key) ? iteration[key] : null;
      if (!valueTransform) {
        if (value && typeof value === 'object' && value.length > 1) {
          valueTransform[key] = {in: []};
        } else {
          valueTransform[key] = null;
        }
      }
      if (value && typeof value === 'object' && value.length > 1) {
        valueTransform[key].in.push(value);
      } else {
        valueTransform[key] = value;
      }
    }
    return Promise.resolve(valueTransform);
  } catch (err) {
    return Promise.reject(err);
  }
};

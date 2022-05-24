module.exports = async function getEditsColumns(columnElement) {
  try {
    let result = {isContain: false, toIterate: null};
    if ((columnElement && (columnElement.in || columnElement.nin)) ||
      (typeof columnElement === 'object' && columnElement && columnElement.length > 0)) {
      // use In array or directly the element
      result.toIterate = columnElement.in ? columnElement.in :
        columnElement.nin ? columnElement.nin : columnElement;
      result.isContain = true;
    }
    return Promise.resolve(result);
  } catch (err) {
    return Promise.reject(err);
  }
};

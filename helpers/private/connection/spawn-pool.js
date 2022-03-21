const SQLSERVER = require('machinepack-sqlserver-adapter');
module.exports = async function spawnConnection(datastore) {
  if (!datastore || !datastore.manager || !datastore.config) {
    return Promise.reject(new Error('Spawn Connection requires a valid datastore.'));
  }
  const reportConnection = await SQLSERVER.getConnection({
    manager: datastore.manager,
    meta: datastore.config
  }).catch(err => {
    return Promise.reject(err);
  });
  return Promise.resolve({connection: reportConnection.connection});
};

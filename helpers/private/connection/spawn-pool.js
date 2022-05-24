const SQLSERVER = require('machinepack-sqlserver-adapter');
module.exports = async function spawnConnection(datastore, cb) {
  if (!datastore || !datastore.manager || !datastore.config) {
    return cb(new Error('Spawn Connection requires a valid datastore.'));
  }
  const reportConnection = await SQLSERVER.getConnection({
    manager: datastore.manager,
    meta: datastore.config
  }).catch(err => {
    return cb(err);
  });
  return cb(undefined, {connection: reportConnection.connection});
};

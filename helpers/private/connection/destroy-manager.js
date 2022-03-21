const MSSQL = require('machinepack-sqlserver-adapter');
module.exports = async function destroyManager(manager) {
  await MSSQL.destroyManager({
    manager: manager
  }).catch(err => {
    return Promise.reject(new Error('There was an error destroying the connection manager.\n\n' + err.stack));
  });
  return Promise.resolve();
};

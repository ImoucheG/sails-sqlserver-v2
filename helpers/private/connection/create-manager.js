const SQLSERVER = require('machinepack-sqlserver-adapter');
module.exports = async function createManager(connectionConfiguration) {
  const report = await SQLSERVER.createManager({
    connectionConfig: connectionConfiguration
  }).catch(err => {
    throw new Error('There was an error creating the connection manager.\n\n' + err.stack);
  });
  if (report) {
    return Promise.resolve(report);
  }
};

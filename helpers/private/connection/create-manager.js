//   ██████╗██████╗ ███████╗ █████╗ ████████╗███████╗
//  ██╔════╝██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔════╝
//  ██║     ██████╔╝█████╗  ███████║   ██║   █████╗
//  ██║     ██╔══██╗██╔══╝  ██╔══██║   ██║   ██╔══╝
//  ╚██████╗██║  ██║███████╗██║  ██║   ██║   ███████╗
//   ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝
//
//  ███╗   ███╗ █████╗ ███╗   ██╗ █████╗  ██████╗ ███████╗██████╗
//  ████╗ ████║██╔══██╗████╗  ██║██╔══██╗██╔════╝ ██╔════╝██╔══██╗
//  ██╔████╔██║███████║██╔██╗ ██║███████║██║  ███╗█████╗  ██████╔╝
//  ██║╚██╔╝██║██╔══██║██║╚██╗██║██╔══██║██║   ██║██╔══╝  ██╔══██╗
//  ██║ ╚═╝ ██║██║  ██║██║ ╚████║██║  ██║╚██████╔╝███████╗██║  ██║
//  ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝
//
// Create a new connection manager to use.

var SQLSERVER = require('machinepack-sqlserver-adapter');

module.exports = function createManager(connectionConfiguration, config, cb) {
  SQLSERVER.createManager({
    connectionConfig: connectionConfiguration,
    meta: config
  }).exec(function createManagerCb(err, report) {
    if (err) {
      return cb(new Error('There was an error creating the connection manager.\n\n' + err.stack));
    }
    return cb(report);
  });
};

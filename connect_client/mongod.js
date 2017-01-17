/**
 * Created by sam on 17/1/2.
 */

"use strict";

const mongoose = require('mongoose');

const SystemConfig = require('../modules/SystemConfig');
const ExceptionLogger = require('../modules/Logger').exceptionLogger;
const ProcessExitError = require('../modules/Error').ProcessExitError;

const mongoConfig = SystemConfig.getSection('datasources/mongod');

exports.connect = function connect() {
  var port = mongoConfig.port;

  var connectArgs = [mongoConfig.host, mongoConfig.name || 'planer'];

  // port
  if (port) connectArgs.push(port);

  // options
  connectArgs.push({
    auth: true,
    user: mongoConfig.user,
    pass: mongoConfig.pwd + ''
  });

  // callback
  connectArgs.push(function(err) {
    if (err) {
      let processExitError = new ProcessExitError('process exit because of mongo connection failed', {
        cause: err
      });
      ExceptionLogger.error(processExitError);

      // todo: maybe need to specify the meaning of exit codes
      // process.exit(1);
    }
  });

  // 配置有效性的校验交给mongoose 来完成
  return mongoose.connect.apply(mongoose, connectArgs);
};
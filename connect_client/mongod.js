/**
 * Created by sam on 17/1/2.
 */

"use strict";

const mongoose = require('mongoose');

const SystemConfig = require('../utils/config');
const {
    exceptionLogger: ExceptionLogger,
    dbMongoLogger : MongoLogger
} = require('../utils/logger');

const ProcessExitError = require('../utils/error').ProcessExitError;

const mongoConfig = SystemConfig.getSection('datasources/mongod');

exports.connect = function connect() {
  var port = mongoConfig.port;

  var connectArgs = [mongoConfig.host, mongoConfig.name || 'planer'];

  // port
  if (port) connectArgs.push(port);

  let user = mongoConfig.user;
  let pass = mongoConfig.pwd || mongoConfig.password;

  if (pass != null) {
    pass = pass.toString();
  }

  if (user == null || pass == null) {
    MongoLogger.warn({
      user: user,
      pass: pass
    }, 'try to connect mongo db without authentication, it is not safe enough and may cause commands execute failed! Make sure that this is expected behavior!')
  }

  // options
  connectArgs.push({
    auth: true,
    user: user,
    pass: pass
  });

  // callback
  connectArgs.push(function(err) {
    if (err) {
      let processExitError = new ProcessExitError({
        cause: err
      }, 'process exit because of mongo connection failed');
      ExceptionLogger.error(processExitError);

      process.exit(1);
    }
  });

  // 配置有效性的校验交给mongoose 来完成
  return mongoose.connect.apply(mongoose, connectArgs);
};
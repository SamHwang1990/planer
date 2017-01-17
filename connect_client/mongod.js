/**
 * Created by sam on 17/1/2.
 */

const mongoose = require('mongoose');

const SystemConfig = require('../modules/SystemConfig');

const mongodConfig = SystemConfig.getSection('datasources/mongod');

exports.connect = function connect() {
  return mongoose.connect(`mongodb://${mongodConfig.host}${mongodConfig.port ? ':' + mongodConfig.port : ''}/${mongodConfig.name || 'planer'}`, {
    auth: true,
    user: mongodConfig.user,
    pass: mongodConfig.pwd + ''
  }, function (err) {
    if (err) {
      // todo: write log
      // process.exit(1);
    }
  });
};
/**
 * Created by sam on 17/1/5.
 */

const redis = require('koa-redis');

const SystemConfig = require('../utils/config');

const dbConfig = SystemConfig.getSection('datasources/redis');

exports.connect = function() {
  return redis({
    host: dbConfig.host,
    port: dbConfig.port
  });
};

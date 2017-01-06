/**
 * Created by sam on 17/1/5.
 */

const redis = require('koa-redis');

const SystemConfig = require('../modules/SystemConfig');

const dbConfig = SystemConfig.getSection('datasources/redis');

exports.connect = function(/*options*/) {
  return redis({
    url: `redis://${dbConfig.user}:${dbConfig.pwd}@${dbConfig.host}:${dbConfig.port}`
  });
};

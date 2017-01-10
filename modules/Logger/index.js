/**
 * Created by samhwang1990@gmail.com on 17/1/9.
 */

'use strict';

const bunyan = require('bunyan');
const SystemConfig = require('../SystemConfig');

const LoggerCategory = {
  STATIC: 'static',
  API_REQ: 'api_request',
  API_RES: 'api_response',
  DB_MONGOD: 'db_mongod',
  DB_REDIS: 'db_redis',
  EXCEPTION: 'exception'
};

const loggerStream = SystemConfig.getString('programs/log/dist') === 'stdout'
    ? process.stdout
    : `../logs/planer.log`;

const loggerLevel = SystemConfig.getString('programs/log/level');

exports.staticLogger = bunyan.createLogger({
  name: LoggerCategory.STATIC,
  stream: loggerStream,
  level: loggerLevel
});

exports.apiReqLogger = function() {};

exports.apiResLogger = function() {};

exports.dbMongodLogger = function() {};

exports.dbRedisLogger = function() {};

exports.exceptionLogger = function() {};
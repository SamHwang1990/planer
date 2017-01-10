/**
 * Created by samhwang1990@gmail.com on 17/1/9.
 */

'use strict';

const log4js = require('log4js');
const SystemConfig = require('../SystemConfig');

const PlanerLoggerCategory = {
  STATIC: 'static',
  API_REQ: 'api_request',
  API_RES: 'api_response',
  DB_MONGOD: 'db_mongod',
  DB_REDIS: 'db_redis',
  EXCEPTION: 'exception'
};

var appenderList = {
  'stdout': {
    type: 'stdout'
  },
  'file': {
    type: 'file',
    filename: 'logs/planer.log',
    backups: 10
  }
};

var appender = Object.assign(
    {},
    SystemConfig.getString("programs/log/dist").toLowerCase() === 'file' ? appenderList.file : appenderList.stdout,
    {category: '[all]'}
);

log4js.configure({
  appenders: [appender],
  levels: {
    '[all]': SystemConfig.getString('programs/log/level')
  }
});

function baseLogCompiler(logMethod, meta) {
  if (!logMethod) return log4js.getLogger(PlanerLoggerCategory.EXCEPTION).error('fail to stringify log data');

  try {
    let log = JSON.stringify(meta);
    logMethod(log);
  } catch (e) {
    log4js.getLogger(PlanerLoggerCategory.EXCEPTION).warn('fail to stringify log data');
  }
}

exports.staticLogger = function() {

};

exports.apiReqLogger = function() {};

exports.apiResLogger = function() {};

exports.dbMongodLogger = function() {};

exports.dbRedisLogger = function() {};

exports.exceptionLogger = function() {};
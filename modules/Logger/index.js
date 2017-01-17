/**
 * Created by samhwang1990@gmail.com on 17/1/9.
 */

'use strict';

const path = require('path');

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
    ? { type: 'stream', stream: process.stdout }
    : { type: 'file', path: path.resolve(__dirname, '../../logs/planer.log') };

const loggerLevel = SystemConfig.getString('programs/log/level');

const baseLoggerConfig = {
  streams: [loggerStream],
  level: loggerLevel
};

const PlanerSerializers = {
  req: function koaReqSerializer(req) {
    if (!req || !req.socket) {
      return req;
    }

    return {
      method: req.method,
      protocol: req.protocol,
      query: req.query,
      remoteAddress: req.ip,
      remotePort: req.socket.remotePort || '',
      jwt: req.ctx.cookies.get('planer.token')
    }
  },
  res: function koaResSerializer(res) {
    if (!res || !res.status) {
      return res;
    }

    return {
      statusCode: res.status,
      statusMessage: res.message
    }
  },
  apiModule: function PlanerApiModuleSerializer(apiPath) {
    if (Array.isArray(apiPath)) {
      apiPath = apiPath.join('.');
    }
    return apiPath;
  },
  apiResult: function PlanerApiResultSerializer({code, meta, msg}) {
    return {
      code,
      meta,   // may need to substring
      msg
    }
  }
};

exports.staticLogger = bunyan.createLogger(Object.assign({} , baseLoggerConfig, {
  name: LoggerCategory.STATIC,
  serializers: {
    req: PlanerSerializers.req,
    res: PlanerSerializers.res
  }
}));

exports.apiReqLogger = bunyan.createLogger(Object.assign({} , baseLoggerConfig, {
  name: LoggerCategory.API_REQ,
  serializers: {
    apiModule: PlanerSerializers.apiModule,
    req: PlanerSerializers.req
  }
}));

exports.apiResLogger = bunyan.createLogger(Object.assign({}, baseLoggerConfig, {
  name: LoggerCategory.API_RES,
  serializers: {
    apiModule: PlanerSerializers.apiModule,
    req: PlanerSerializers.req,
    res: PlanerSerializers.res,
    apiResult: PlanerSerializers.apiResult
  }
}));

exports.dbMongodLogger = function() {};

exports.dbRedisLogger = function() {};

exports.exceptionLogger = bunyan.createLogger(Object.assign({}, baseLoggerConfig, {
  name: LoggerCategory.EXCEPTION,
  level: 'trace',
  serializers: {
    err: bunyan.stdSerializers.err
  }
}));
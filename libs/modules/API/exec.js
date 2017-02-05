/**
 * Created by samhwawng1990@gmail.com on 2017/1/9.
 */

'use strict';

const ApiExport = require('./export');

module.exports = function* exec(apiPath, parameters = {}, options = {}) {
  if (typeof apiPath !== 'string') {
    return ApiExport.export(ApiExport.CODE.FA_UNKNOWN, undefined, 'api path is empty');
  }

  apiPath = apiPath.split('.');

  var modulePath = apiPath.slice(0, -1).join('/');
  var method = apiPath.slice(-1);

  var module;
  var api;

  try {
    module = require(`../${modulePath}`);
  } catch (e) {
    return ApiExport.export(ApiExport.CODE.FA_INVALID_METHOD, undefined, `module ${modulePath} not exist`);
  }

  api = module.api && module.api[method];
  if (!api) {
    return ApiExport.export(ApiExport.CODE.FA_INVALID_METHOD, undefined, `method ${apiPath.join('.')} not exist or is private`);
  }

  yield api(parameters, options);
};
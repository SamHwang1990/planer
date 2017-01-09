/**
 * Created by samhwawng1990@gmail.com on 2017/1/9.
 */

'use strict';

const PlanerError = require('../Error');

module.exports.exec = function* exec(apiPath, parameters = {}, options = {}) {
  if (typeof apiPath !== 'string') throw new PlanerError.InvalidParameterError('exec command failed: no api path');

  apiPath = apiPath.split('.');

  var modulePath = apiPath.slice(0, -1).join('/');
  var method = apiPath.slice(-1);

  // todo: 接口调用需要：确定接口是否存在、接口是否在黑名单中（如果调整接口公开的机制，可能不会有黑名单的存在）

  var api;
  try {

  } catch (e) {

  }
};
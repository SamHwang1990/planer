/**
 * Created by samhwawng1990@gmail.com on 2017/1/23.
 *
 * 检测登录模块的session，为的是防止登录重放
 */

'use strict';

const uid = require('uid-safe');
const PlanerError = require('../Error');

const login_sid_key = 'login.tsid';
const sid_prefix = 'login.sid:';
const login_nonce_key = 'login.nonce';

exports.login_sid_key = login_sid_key;
exports.login_nonce_key = login_nonce_key;
exports.login_sid_prefix = sid_prefix;

exports.verifySession = function* verifySession() {
  var loginTempSid = this.cookies.get(login_sid_key);
  var loginNonce = this.cookies.get(login_nonce_key);

  if (!loginTempSid) {
    return {
      errorCode: PlanerError.CODE.FA_EMPTY_LOGIN_SESSION,
      errorMsg: 'login tsid is empty'
    }
  }

  if (!loginNonce) {
    return {
      errorCode: PlanerError.CODE.FA_INVALID_LOGIN_SESSION,
      errorMsg: 'login nonce is empty'
    }
  }

  let loginTempSidKey = sid_prefix + loginTempSid;

  let isTempSidExisted = yield this.app.redisClient.client.EXISTS(loginTempSidKey);
  if (!isTempSidExisted) {
    return {
      errorCode: PlanerError.CODE.FA_INVALID_LOGIN_SESSION,
      errorMsg: 'login tsid is invalid'
    }
  }

  let currentNonce = yield this.app.redisClient.client.HGET(loginTempSidKey, 'nonce');
  if (currentNonce == null || currentNonce !== loginNonce) {
    return {
      errorCode: PlanerError.CODE.FA_INVALID_LOGIN_SESSION,
      errorMsg: 'login nonce is invalid'
    }
  } else {
    return {
      errorCode: null
    }
  }
};

// 清除redis 中和cookie 中的session 记录
// 当用户成功登录时应该触发该步骤
exports.cleanSession = function* cleanSession() {
  var loginTempSid = this.cookies.get(login_sid_key);
  if (loginTempSid) {
    yield this.app.redisClient.client.DEL(loginTempSid);
  }

  this.cookies.set(login_sid_key, null);
  this.cookies.set(login_nonce_key, null);
};

exports.createSession = function* createSession() {
  var tsid = uid.sync(24);
  var nonce = uid.sync(6);
  var tsidKey = sid_prefix + tsid;

  yield this.app.redisClient.client.HSET(tsidKey, 'nonce', nonce);
  yield this.app.redisClient.client.EXPIRE(tsidKey, 5 * 60);

  this.cookies.set(login_sid_key, tsid, {httpOnly: true});
  this.cookies.set(login_nonce_key, nonce, {httpOnly: true});

  return {
    tsid: tsid,
    nonce: nonce
  }
};

exports.updateNonce = function* updateNonce() {
  var loginTempSid = this.cookies.get(login_sid_key);
  var nonce = uid.sync(6);

  yield this.app.redisClient.client.HSET(sid_prefix + loginTempSid, 'nonce', nonce);

  this.cookies.set(login_nonce_key, nonce, {httpOnly: true});

  return {
    tsid: loginTempSid,
    nonce: nonce
  }
};

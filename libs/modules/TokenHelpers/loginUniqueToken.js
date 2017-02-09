/**
 * Created by samhwawng1990@gmail.com on 2017/1/23.
 *
 * 检测登录模块的session，为的是防止登录重放
 */

'use strict';

const uid = require('uid-safe');

const PlanerError = require('../../utils/error');
const SessionClient = require('../SessionClient');

const login_token_key = 'login.tsid';
const sidLength = 6;
const nonceLength = 6;

const tokenCookieStore = {
  get: function(koaContext) {
    return koaContext.cookies.get(login_token_key, {/*options*/});
  },

  set: function(koaContext, token, cookieOption = {httpOnly: true}) {
    koaContext.cookies.set(login_token_key, token, cookieOption);
  },

  reset: function(koaContext) {
    koaContext.cookies.set(login_token_key, null);
  }
};

function decodeCookieValue(value) {
  value = new Buffer(value, 'base64').toString('ascii');
  let sid = value.substr(0, sidLength);
  let nonce = value.slice(-1, nonceLength);

  return {
    sid,
    nonce
  }
}

function encodeCookieValue(sid, nonce) {
  let value = sid + nonce;
  return new Buffer(value).toString('base64');
}

function newTokenSid() {
  return uid.sync(sidLength);
}

function newTokenNonce() {
  return uid.sync(nonceLength);
}

function* verifyToken(planerContext) {
  let tokenInCookie = tokenCookieStore.get(planerContext.context);

  if (!tokenInCookie) {
    return {
      errorCode: PlanerError.CODE.FA_EMPTY_LOGIN_SESSION,
      errorMsg: 'login tsid is empty'
    }
  }

  let {sid, nonce} = decodeCookieValue(tokenInCookie);
  if (!sid) {
    return {
      errorCode: PlanerError.CODE.FA_INVALID_SESSION,
      errorMsg: 'login tsid is empty'
    }
  }

  if (!nonce) {
    return {
      errorCode: PlanerError.CODE.FA_INVALID_LOGIN_SESSION,
      errorMsg: 'login nonce is empty'
    }
  }

  let session = SessionClient.restoreLoginSession(planerContext, sid, (yield planerContext.getRedisClient()));
  if (!(yield session.isAlived())) {
    return {
      errorCode: PlanerError.CODE.FA_INVALID_LOGIN_SESSION,
      errorMsg: 'login tsid is invalid'
    }
  }

  let currentNonceOfSession = yield session.getAttr('nonce');
  if (currentNonceOfSession == null || currentNonceOfSession !== nonce) {
    return {
      errorCode: PlanerError.CODE.FA_INVALID_LOGIN_SESSION,
      errorMsg: 'login nonce is invalid'
    }
  } else {
    return {
      errorCode: null
    }
  }
}

// 清除redis 中和cookie 中的session 记录
// 当用户成功登录时应该触发该步骤
function* cleanToken(planerContext) {
  let tokenInCookie = tokenCookieStore.get(planerContext.context);

  if (tokenInCookie) {
    let {sid} = decodeCookieValue(tokenInCookie);
    let session = SessionClient.restoreLoginSession(planerContext, sid, (yield planerContext.getRedisClient()));
    yield session.destroySession();
  }

  tokenCookieStore.reset(planerContext.context);
}

function* upsertToken(planerContext) {
  let tokenInCookie = tokenCookieStore.get(planerContext.context);

  if (tokenInCookie) {
    let {sid} = decodeCookieValue(tokenInCookie);
    let session = SessionClient.restoreLoginSession(planerContext, sid, (yield planerContext.getRedisClient()));

    if (yield session.isAlived()) {
      let nonce = newTokenNonce();

      tokenCookieStore.set(planerContext.context, encodeCookieValue(sid, nonce));

      yield session.setAttr('nonce', nonce);
      yield session.refreshTTL();

      return {
        action: 'update',
        sid,
        nonce
      }
    }
  }

  let session = SessionClient.newLoginSession(planerContext, (yield planerContext.getRedisClient()));
  let nonce = yield session.getAttr('nonce');

  tokenCookieStore.set(planerContext.context, encodeCookieValue(session.sid, nonce));

  return {
    action: 'insert',
    sid: session.sid,
    nonce
  }
}

module.exports = {
  login_token_key,

  tokenCookieStore,

  decodeCookieValue,
  encodeCookieValue,

  newTokenSid,
  newTokenNonce,

  verifyToken,
  cleanToken,
  upsertToken
};
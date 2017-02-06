/**
 * Created by samhwawng1990@gmail.com on 2017/2/6.
 */

'use strict';

const uuid = require('uuid');
const uid = require('uid-safe');
const jwt = require('jsonwebtoken');

const PlanerConfig = require('../../utils/config');
const PlanerError = require('../../utils/error');

const SessionClient = require('../SessionClient');

const token_cookie_key = 'planer.token';
const token_blacklist_redis_prefix = 'rest.token.blacklist:';

const tokenCookieStore = {
  get: function(koaContext) {
    return koaContext.cookies.get(token_cookie_key, {/*options*/});
  },

  set: function(koaContext, token, cookieOption = {httpOnly: true}) {
    koaContext.cookies.set(token_cookie_key, token, cookieOption);
  },

  reset: function(koaContext) {
    koaContext.cookies.set(token_cookie_key, null);
  }
};

function* signToken(jwtId, {sid, userInfo} = {}) {
  var secret = PlanerConfig.getString('programs/JWT/sign-secret', 'planer');
  if (!secret || secret.toLowerCase() === 'planer') {
    if (process.NODE_ENV === 'development') {
      // console.log('not secret or secret too simple');
    }
  }

  return yield new Promise((resolve, reject) => {
    jwt.sign({
      data: {
        sid: sid,
        userInfo: userInfo || ''
      }
    }, secret, {
      expiresIn: PlanerConfig.getString('programs/JWT/timeout', '1d'),
      jwtid: jwtId
    }, (err, token) => {
      if (err) return reject(err);
      resolve(token);
    });
  });
}

function* verifyToken(planerContext) {
  var tokenInCookie = tokenCookieStore.get(planerContext.context);

  if (!tokenInCookie) {
    return {
      errorCode: PlanerError.CODE.FA_TOKEN_NOT_FOUND,
      errorMsg: 'token is empty'
    }
  }

  var tokenPayload;
  // jwt 校验
  try {
    tokenPayload = jwt.verify(tokenInCookie, PlanerConfig.getString('programs/JWT/sign-secret', 'planer'));
  } catch (e) {
    if (e.name === 'TokenExpiredError') {
      return {
        errorCode: PlanerError.CODE.FA_TOKEN_EXPIRED,
        errorMsg: `jwt expired at ${e.expiredAt}`,
        expiredAt: e.expiredAt
      }
    } else {
      return {
        errorCode: PlanerError.CODE.FA_INVALID_TOKEN,
        errorMsg: e.message
      }
    }
  }

  var jwtId = tokenPayload.jti;
  var tokenData = tokenPayload.data;
  var sid = tokenPayload.data.sid;
  var redisClient = yield planerContext.getRedisClient();
  var session = yield SessionClient.restoreRestSession(planerContext, sid, redisClient);

  // jwt 指向的sid 不存在
  if (!(yield session.isAlived())) {
    return {
      errorCode: PlanerError.CODE.FA_INVALID_SESSION,
      errorMsg: 'session not existed'
    }
  }

  let currentJtiOfSession = yield session.getAttr('jwtId');

  // session 校验通过
  if (currentJtiOfSession != null && currentJtiOfSession === jwtId) {
    return {
      errorCode: null,
      sid: sid,
      jwtId: jwtId,
      tokenData: tokenData
    }
  }

  // jwt 的id 不是session 当前id, 且不在黑名单中
  if (!(yield redisClient.EXISTS(`${token_blacklist_redis_prefix}${jwtId}`))) {
    return {
      errorCode: PlanerError.CODE.FA_INVALID_TOKEN,
      errorMsg: `not the current token of session ${sid}, and not existed in the blacklist`
    }
  }

  // 黑名单中token 指向的sid 与jwt 指向的sid 不一致
  let sidOfTokenInBlacklist = yield redisClient.GET(`${token_blacklist_redis_prefix}${jwtId}`);
  if (sidOfTokenInBlacklist !== sid) {
    return {
      errorCode: PlanerError.CODE.FA_INVALID_TOKEN,
      errorMsg: `token in the blacklist had wrong session ${sidOfTokenInBlacklist}.`
    }
  }

  // 黑名单中token 校验成功
  return {
    errorCode: null,
    inBlacklist: true,
    sid: sid,
    jwtId: jwtId,
    tokenData: tokenData
  }
}

// invoke after new rest session
function* createToken(planerContext) {
  var session = yield planerContext.getSessionClient();
  var user = yield planerContext.getUser();

  var sessionTimeout = PlanerConfig.getMilliseconds('programs/JWT/timeout', '1d');
  var jwtId = uid.sync(6);

  var token = yield signToken(jwtId, {sid: session.sid, userInfo: user});
  tokenCookieStore.set(planerContext.context, token, {
    httpOnly: true,
    maxAge: sessionTimeout
  });

  yield session.setAttr('jwtId', jwtId);

  return {
    sid: session.sid,
    jwtId: jwtId
  }
}

function* cleanToken(planerContext) {
  tokenCookieStore.reset(planerContext.context);
}

function* refreshToken(planerContext) {
  var session = yield planerContext.getSessionClient();
  var redisClient = yield planerContext.getRedisClient();
  var sid = session.sid;
  var currentJti = yield session.getAttr('jwtId');

  if (currentJti) {
    let tokenBlacklistGraceTime = PlanerConfig.getSeconds('programs/JWT/lifetime-grace-time', '1m');
    yield redisClient.SETEX(`${token_blacklist_redis_prefix}${currentJti}`, tokenBlacklistGraceTime, sid);
  }

  var jwtId = uid.sync(6);
  var token = yield signToken(sid, jwtId);
  tokenCookieStore.set(planerContext.context, token);

  yield session.setAttr('jwtId', jwtId);

  return {
    sid: sid,
    jwtId: jwtId
  }
}

module.exports = {
  token_cookie_key,
  token_blacklist_redis_prefix,

  signToken,
  verifyToken,
  createToken,
  cleanToken,
  refreshToken
};
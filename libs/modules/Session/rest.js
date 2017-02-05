/**
 * Created by samhwang1990@gmail.com on 17/1/30.
 */

'use strict';

const uid = require('uid-safe');
const uuid = require('uuid');
const jwt = require('jsonwebtoken');
const ms = require('ms');

const SystemConfig = require('.././config');
const PlanerError = require('.././error');

const token_cookie_key = 'planer.token';
const token_blacklist_redis_prefix = 'rest.token.blacklist:';
const sid_redis_prefix = 'rest.sid:';

const tokenCookieStore = {
  get: function(context) {
    return context.cookies.get(token_cookie_key, {/*options*/});
  },

  set: function(context, token, cookieOption = {httpOnly: true}) {
    context.cookies.set(token_cookie_key, token, cookieOption);
  },

  reset: function(context) {
    context.cookies.set(token_cookie_key, null);
  }
};

function* signToken(sid, jwtId) {
  var secret = SystemConfig.getString('programs/JWT/sign-secret', 'planer');
  if (!secret || secret.toLowerCase() === 'planer') {
    if (process.NODE_ENV === 'development') {
      // console.log('not secret or secret too simple');
    }
  }

  return yield new Promise((resolve, reject) => {
    jwt.sign({
      data: {
        sid: sid
      }
    }, secret, {
      expiresIn: SystemConfig.getString('programs/JWT/timeout', '1d'),
      jwtid: jwtId
    }, (err, token) => {
      if (err) return reject(err);
      resolve(token);
    });
  });
}

exports.token_cookie_key = token_cookie_key;
exports.token_blacklist_redis_prefix = token_blacklist_redis_prefix;
exports.sid_redis_prefix = sid_redis_prefix;

exports.cookieStore = tokenCookieStore;

exports.createSession = function* createSession(context, userInfo) {

  var sessionTimeout = ms(SystemConfig.getString('programs/JWT/timeout', '1d'));

  if (userInfo == null) {
    throw new PlanerError.InvalidParameterError('create rest session failed: userinfo parameter can not be empty.');
  }

  var sid = uuid.v4();
  var jwtId = uid.sync(6);

  var token = yield signToken(sid, jwtId);
  tokenCookieStore.set(context, token, {
    httpOnly: true,
    maxAge: sessionTimeout
  });

  yield context.app.redisClient.client.HSET(`${sid_redis_prefix}${sid}`, 'jwtId', jwtId);
  yield context.app.redisClient.client.HSET(`${sid_redis_prefix}${sid}`, 'userInfo', JSON.stringify(userInfo));
  yield context.app.redisClient.client.EXPIRE(`${sid_redis_prefix}${sid}`, sessionTimeout/1000);

  return {
    sid: sid,
    jwtId: jwtId
  }
};

exports.refreshTokenByCookie = function* refreshTokenByCookie(context) {
  var tokenInCookie = tokenCookieStore.get(context);
  var tokenPayload;

  try {
    tokenPayload = jwt.decode(tokenInCookie);
  } catch (e) {
    throw new PlanerError.BasicError(
        {
          cause: e,
          info: {
            code: PlanerError.CODE.FA_INVALID_TOKEN
          }
        },
        'decoding token error when try to refresh token');
  }

  return yield module.exports.refreshToken(context, tokenPayload.data.sid, tokenPayload.jti);
};

exports.refreshToken = function* refreshToken(context, sid, oldJti) {
  if (sid == null) {
    throw new PlanerError.InvalidParameterError('refresh token failed: sid parameter can not empty.');
  }

  if (oldJti) {
    let tokenBlacklistGraceTime = ms(SystemConfig.getString('programs/JWT/lifetime-grace-time', '1m')) / 1000;
    yield context.app.redisClient.client.SETEX(`${token_blacklist_redis_prefix}${oldJti}`, tokenBlacklistGraceTime, sid);
  }

  var jwtId = uid.sync(6);

  var token = yield signToken(sid, jwtId);
  tokenCookieStore.set(context, token);

  yield context.app.redisClient.client.HSET(`${sid_redis_prefix}${sid}`, 'jwtId', jwtId);

  return {
    sid: sid,
    jwtId: jwtId
  }
};

exports.refreshSession = function* refreshSession(context, sid) {
  if (sid == null) {
    throw new PlanerError.InvalidParameterError('refresh session failed: sid parameter can not empty.');
  }

  let refreshResult = yield context.app.redisClient.client.EXPIRE(`${sid_redis_prefix}${sid}`, ms(SystemConfig.getString('programs/JWT/timeout', '1d'))/1000);

  if (refreshResult !== 1) {
    throw new PlanerError.BasicError({
      info: {
        code: PlanerError.CODE.FA_INVALID_SESSION
      }
    }, 'refresh session failed when session is not existed.');
  }
};

exports.verifySession = function* verifySession(context) {
  var tokenInCookie = tokenCookieStore.get(context);

  if (!tokenInCookie) {
    return {
      errorCode: PlanerError.CODE.FA_TOKEN_NOT_FOUND,
      errorMsg: 'token is empty'
    }
  }

  var tokenPayload;

  // jwt 校验
  try {
    tokenPayload = jwt.verify(tokenInCookie, SystemConfig.getString('programs/JWT/sign-secret', 'planer'));
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

  let tokenData = tokenPayload.data;
  let sid = tokenPayload.data.sid;
  let jwtId = tokenPayload.jti;

  // jwt 指向的sid 不存在
  if (!(yield context.app.redisClient.client.EXISTS(`${sid_redis_prefix}${sid}`))) {
    return {
      errorCode: PlanerError.CODE.FA_INVALID_SESSION,
      errorMsg: 'session not existed'
    }
  }

  let currentTokenIdOfSession = yield context.app.redisClient.client.HGET(`${sid_redis_prefix}${sid}`, 'jwtId');

  // session 校验通过
  if (currentTokenIdOfSession != null && currentTokenIdOfSession === jwtId) {
    return {
      errorCode: null,
      sid: sid,
      jwtId: jwtId,
      tokenData: tokenData
    }
  }

  // jwt 的id 不是session 当前id, 且不在黑名单中
  if (!(yield context.app.redisClient.client.EXISTS(`${token_blacklist_redis_prefix}${jwtId}`))) {
    return {
      errorCode: PlanerError.CODE.FA_INVALID_TOKEN,
      errorMsg: `not the current token of session ${sid}, and not existed in the blacklist`
    }
  }

  // 黑名单中token 指向的sid 与jwt 指向的sid 不一致
  let sidOfTokenInBlacklist = yield context.app.redisClient.client.GET(`${token_blacklist_redis_prefix}${jwtId}`);
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
};

exports.destroySession = function* destroySession(context) {
  var tokenInCookie = tokenCookieStore.get(context);

  var tokenPayload;

  try {
    tokenPayload = jwt.verify(tokenInCookie, SystemConfig.getString('programs/JWT/sign-secret', 'planer'), {ignoreExpiration: true});
  } catch (e) {
    throw new PlanerError.BasicError(
        {
          cause: e,
          info: {
            code: PlanerError.CODE.FA_INVALID_TOKEN
          }
        },
        'verifying token error when try to destroy session');
  }

  let sid = tokenPayload.data.sid;

  yield context.app.redisClient.client.DEL(`${sid_redis_prefix}${sid}`);
  tokenCookieStore.reset(context);
};
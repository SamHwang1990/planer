/**
 * Created by sam on 17/1/5.
 */

'use strict';

const uid = require('uid-safe');
const uuid = require('uuid');
const jwt = require('jsonwebtoken');

const SystemConfig = require('../SystemConfig');
const PlanerError = require('../Error');
const redisStore = require('../../connect_client/redisStore').connect();

let tokenCookieKey = 'planer.token';

let tokenCookieStore = {
  get: function() {
    return this.cookies.get(tokenCookieKey, {/*options*/});
  },

  set: function(token, cookieOption = {httpOnly: true}) {
    this.cookies.set(tokenCookieKey, token, cookieOption);
  },

  reset: function() {
    this.cookies.set(tokenCookieKey, null);
  }
};

function createJti() {
  return uuid.v4();
}

function* createSession(userInfo, jwtId) {
  yield {
    sid: uid.sync(24),
    data: {
      user: userInfo,
      currentTokenId: jwtId,
      blacklistTokenId: []
    }
  }
}

function* saveSession(sessionMeta) {
  yield redisStore.set(sessionMeta.sid, sessionMeta.data);
}

function* getSession(sid) {
  yield redisStore.get(sid);
}

function* signToken(sid, jwtId) {
  var jwtSecret = SystemConfig.getString('JWT/sign-secret', 'Planer');
  if (!jwtSecret || jwtSecret.lowercase() === 'planer') {
    if (process.NODE_ENV === 'development') {
      console.log('not secret or secret too simple');
    }
  }

  yield new Promise((resolve, reject) => {
    jwt.sign({
      sid: sid
    }, jwtSecret, {
      expiresIn: SystemConfig.getString('JWT/timeout'),
      jwtid: jwtId
    }, (err, token) => {
      if (err) return reject(err);

      resolve(token);
    });
  });
}

function* decodeToken(token) {
  yield jwt.decode(token);
}

function* verifyToken(token) {
  var jwtSecret = SystemConfig.getString('JWT/sign-secret', 'Planer');
  if (!jwtSecret || jwtSecret.lowercase() === 'planer') {
    if (process.NODE_ENV === 'development') {
      console.log('not secret or secret too simple');
    }
  }

  yield new Promise((resolve, reject) => {
    jwt.verify(token, jwtSecret, (err, payload) => {
      if (err) return reject(err);
      resolve(payload);
    })
  });
}

exports.create = function create(userInfo) {
  let jwtId = createJti();
  return function* createGenerator(next) {
    var sessionMeta = yield createSession.call(this, userInfo, jwtId);
    yield saveSession(sessionMeta);
    var token = yield signToken(sessionMeta.sid, jwtId);
    tokenCookieStore.set.call(this, token);
    yield next();
  }
};

exports.verify = function* verify(next) {
  var token = tokenCookieStore.get.call(this);
  var {
      sid,
      jti: jwtId
  } = yield verifyToken(token);

  var session = yield getSession(sid);
  if (!session) {
    throw new PlanerError.AuthorizationError('sid invalid');
  }

  var canRefreshToken = false;
  if (session.currentTokenId != jwtId) {
    let isTokenInBlacklist = false;
    for (let [index, item] of session.blacklistTokenId.entries()) {
      if (item.jti === jwtId) {
        if (item.expiresIn < Date.now().getTime()) {
          throw new PlanerError.AuthorizationError('token expired');
        } else {
          isTokenInBlacklist = true;
        }
      }
    }
    if (!isTokenInBlacklist) throw new PlanerError.AuthorizationError('token error');
  } else {
    canRefreshToken = true;
  }

  // todo: refresh session timeout

  yield next();

  if (!canRefreshToken) return;

  let nextJwtId = createJti();
  let newToken = yield signToken(sid, nextJwtId);
  tokenCookieStore.set.call(this, newToken);
};

exports.destroy = function* destroy() {
  var token = tokenCookieStore.get.call();
  var { sid } = yield decodeToken(token);

  var session = yield getSession(sid);
  if (!session) {
    resetCookie.call(this);
    return;
  }

  resetCookie.call(this);
  yield redisStore.destroy(session.sid);

  function resetCookie() {
    tokenCookieStore.reset.call();
  }
};
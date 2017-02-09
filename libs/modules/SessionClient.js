/**
 * Created by samhwang1990@gmail.com on 17/2/5.
 */

'use strict';

const PlanerConfig = require('../utils/config');
const PlanerError = require('../utils/error');

const loginUniqueToken = require('./TokenHelpers/loginUniqueToken');

const uuid = require('uuid');
const uid = require('uid-safe');

const redis_key_prefix = {
  login: 'login.sid:',
  temp: 'temp.sid',
  rest_user: 'rest.user.sid:',
  rest_admin: 'rest.admin.sid:'
};

class SessionClient {
  constructor(planerContext, sid, redisClient, sid_key_prefix = redis_key_prefix.rest_user) {
    this.planerContext = planerContext;
    this.redisClient = redisClient;
    this.sid = sid;
    this.key = `${sid_key_prefix}${sid}`;
    this._deleted = false;
  }

  *getAttr (field) {
    if (this._deleted) {
      throw new PlanerError.BasicError(
          { info: { code: PlanerError.CODE.FA_INVALID_SESSION } },
          'get session attribute failed: session was deleted.'
      )
    }
    return (yield this.redisClient.HGET(this.key, field, field));
  }

  *setAttr (field, value) {
    if (this._deleted) {
      throw new PlanerError.BasicError(
          { info: { code: PlanerError.CODE.FA_INVALID_SESSION } },
          'set session attribute failed: session was deleted.'
      )
    }
    yield this.redisClient.HSET(this.key, field, value);
  }

  *destroySession() {
    yield this.redisClient.DEL(this.key);
    this._deleted = true;
  }

  *isAlived() {
    yield this.redisClient.EXISTS(this.key);
  }

  *setTTL(expired) {
    this._ttl = expired;

    let expireResult = yield this.redisClient.EXPIRE(this.key, expired);

    if (expireResult !== 1) {
      throw new PlanerError.BasicError({
        info: {
          code: PlanerError.CODE.FA_INVALID_SESSION
        }
      }, 'refresh session failed when session is not existed.');
    }
  }

  *refreshTTL() {
    if (this._ttl) {
      yield this.setTTL(this.ttl);
    }
  }

  *getTTL() {
    yield this.redisClient.TTL(this.key);
  }

  static *newRestSession(planerContext, redisClient, userInfo = {}) {
    if (!userInfo.hasOwnProperty('email')) {
      throw new PlanerError.InvalidParameterError('create rest session failed: user email can not be empty.');
    }

    let sid = uuid.v4();
    let restSession = new RestSession(planerContext, sid, redisClient);

    yield restSession.setAttr('user_id', userInfo.id);
    yield restSession.setAttr('user_email', userInfo.email);
    yield restSession.refreshTTL();

    return restSession;
  }

  static restoreRestSession(planerContext, sid, redisClient) {
    return new RestSession(planerContext, sid, redisClient);
  }

  static *newLoginSession(planerContext, redisClient) {
    let tsid = loginUniqueToken.newTokenSid();
    let nonce = loginUniqueToken.newTokenNonce();

    let loginSession = new LoginUniqueSession(planerContext, tsid, redisClient);

    yield loginSession.setAttr('nonce', nonce);
    yield loginSession.refreshTTL();

    return loginSession;
  }

  static restoreLoginSession(planerContext, tsid, redisClient) {
    return new LoginUniqueSession(planerContext, tsid, redisClient);
  }

  static *newTempSession(planerContext, redisClient) {
    let tsid = uuid.v4();

    let loginSession = new TempSession(planerContext, tsid, redisClient);

    yield loginSession.setAttr('.keep', 0);
    yield loginSession.refreshTTL();
    return loginSession;
  }

  static restoreTempSession(planerContext, tsid, redisClient) {
    return new TempSession(planerContext, tsid, redisClient);
  }
}

class RestSession extends SessionClient {
  constructor(...args) {
    super(...args, redis_key_prefix.login);
    this._ttl = PlanerConfig.getSeconds('programs/JWT/timeout', '1d');
  }
}

class LoginUniqueSession extends SessionClient {
  constructor(...args) {
    super(...args, redis_key_prefix.login);
    this._ttl = 2 * 60;
  }
}

class TempSession extends SessionClient {
  constructor(...args) {
    super(...args, redis_key_prefix.temp);
    this._ttl = 5 * 60;
  }
}

module.exports = SessionClient;
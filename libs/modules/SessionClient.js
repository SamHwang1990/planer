/**
 * Created by samhwang1990@gmail.com on 17/2/5.
 */

'use strict';

const PlanerConfig = require('../utils/config');
const PlanerError = require('../utils/error');

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
    this.ttl = expired;

    var expireResult = yield this.redisClient.EXPIRE(this.key, expired);

    if (expireResult !== 1) {
      throw new PlanerError.BasicError({
        info: {
          code: PlanerError.CODE.FA_INVALID_SESSION
        }
      }, 'refresh session failed when session is not existed.');
    }
  }

  *refreshTTL() {
    if (this.ttl) {
      yield this.setTTL(this.ttl);
    }
  }

  *getTTL() {
    yield this.redisClient.TTL(this.key);
  }

  static *newRestSession(planerContext, redisClient, userInfo = {}) {
    var sessionTTL = PlanerConfig.getSeconds('programs/JWT/timeout', '1d');

    if (!userInfo.hasOwnProperty('email')) {
      throw new PlanerError.InvalidParameterError('create rest session failed: user email can not be empty.');
    }

    var sid = uuid.v4();
    var restSession = new SessionClient(planerContext, sid, redisClient);

    yield restSession.setAttr('user_id', userInfo.id);
    yield restSession.setAttr('user_email', userInfo.email);
    yield restSession.setTTL(sessionTTL);
    return restSession;
  }

  static restoreRestSession(planerContext, sid, redisClient) {
    var session = new SessionClient(planerContext, sid, redisClient);
    session.ttl = PlanerConfig.getSeconds('programs/JWT/timeout', '1d');
    return session;
  }

  static *newLoginSession(planerContext, redisClient) {
    var sessionTTL = 5 * 60;
    var tsid = uid.sync(6);
    var nonce = uid.sync(6);

    var loginSession = new SessionClient(planerContext, tsid, redisClient, redis_key_prefix.login);

    yield loginSession.setAttr('nonce', nonce);
    yield loginSession.setTTL(sessionTTL);
    return loginSession;
  }

  static restoreLoginSession(planerContext, tsid, redisClient) {
    var session = new SessionClient(planerContext, tsid, redisClient, redis_key_prefix.login);
    session.ttl = 5 * 60;
    return session;
  }

  static *newTempSession(planerContext, redisClient) {
    var sessionTTL = 5 * 60;
    var tsid = uuid.v4();

    var loginSession = new SessionClient(planerContext, tsid, redisClient, redis_key_prefix.temp);

    yield loginSession.setAttr('.keep', 0);
    yield loginSession.setTTL(sessionTTL);
    return loginSession;
  }

  static restoreTempSession(planerContext, tsid, redisClient) {
    var session = new SessionClient(planerContext, tsid, redisClient, redis_key_prefix.temp);
    session.ttl = 5 * 60;
    return session;
  }
}

module.exports = SessionClient;
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
  constructor(context, sid, redisClient, sid_key_prefix = redis_key_prefix.rest_user) {
    this.context = context;
    this.redisClient = redisClient;
    this.sid = sid;
    this.key = `${sid_key_prefix}${sid}`;
  }

  *getAttr (field) {
    return (yield this.redisClient.HGET(this.key, field, field));
  }

  *setAttr (field, value) {
    yield this.redisClient.HSET(this.key, field, value);
  }

  *destroySession() {
    yield this.redisClient.DEL(this.key);
  }

  *isAlived() {
    yield this.redisClient.EXISTS(this.key);
  }

  *setTTL(expired) {
    this.ttl = expired;
    yield this.redisClient.EXPIRE(this.key, expired);
  }

  *refreshTTL() {
    if (this.ttl) {
      yield this.setTTL(this.ttl);
    }
  }

  *getTTL() {
    yield this.redisClient.TTL(this.key);
  }

  static *newRestSession(context, redisClient, userInfo = {}) {
    var sessionTTL = PlanerConfig.getSeconds('programs/JWT/timeout', '1d');

    if (!userInfo.hasOwnProperty('email')) {
      throw new PlanerError.InvalidParameterError('create rest session failed: user email can not be empty.');
    }

    var sid = uuid.v4();
    var restSession = new SessionClient(context, sid, redisClient);

    yield restSession.setAttr('userInfo', JSON.stringify(userInfo));
    yield restSession.setTTL(sessionTTL);
    return restSession;
  }

  static restoreRestSession(context, sid, redisClient) {
    return new SessionClient(context, sid, redisClient);
  }

  static *newLoginSession(context, redisClient) {
    var sessionTTL = 5 * 60;
    var tsid = uuid.v4();
    var nonce = uid.sync(6);

    var loginSession = new SessionClient(context, tsid, redisClient, redis_key_prefix.login);

    yield loginSession.setAttr('nonce', nonce);
    yield loginSession.setTTL(sessionTTL);
    return loginSession;
  }

  static restoreLoginSession(context, tsid, redisClient) {
    return new SessionClient(context, tsid, redisClient, redis_key_prefix.login);
  }

  static *newTempSession(context, redisClient) {
    var sessionTTL = 5 * 60;
    var tsid = uuid.v4();

    var loginSession = new SessionClient(context, tsid, redisClient, redis_key_prefix.temp);

    yield loginSession.setAttr('.keep', 0);
    yield loginSession.setTTL(sessionTTL);
    return loginSession;
  }

  static restoreTempSession(context, tsid, redisClient) {
    return new SessionClient(context, tsid, redisClient, redis_key_prefix.temp);
  }
}

module.exports = SessionClient;
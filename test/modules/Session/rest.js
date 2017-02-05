/**
 * Created by samhwang1990@gmail.com on 17/1/31.
 */

'use strict';

const uuid = require('uuid');
const uid = require('uid-safe');
const ms = require('ms');
const jwt = require('jsonwebtoken');

const PlanerConfig = require('../.././config');
const PlanerError = require('../.././error');
const RestSession = require('../.././Session/rest');

describe('Restful api session testing', function() {
  var RedisClient;

  function createContext() {
    var context = {
      _cookie: {},
      app: {
        redisClient: RedisClient
      },
      cookies: {
        get: (key) => {
          var cookie = context._cookie[key];
          return cookie ? cookie.value : '';
        },
        set: (key, value, opts) => {
          if (value == null) {
            delete context._cookie[key];
            return;
          }
          context._cookie[key] = {
            value: value,
            options: opts
          }
        }
      }
    };
    return context;
  }

  function* signToken(sid, jwtId, secret, expiresIn) {
    secret = secret || PlanerConfig.getString('programs/JWT/sign-secret', 'planer');
    expiresIn = expiresIn || PlanerConfig.getString('programs/JWT/timeout', '1d')

    return yield new Promise((resolve, reject) => {
      jwt.sign({
        data: {
          sid: sid
        }
      }, secret, {
        expiresIn: expiresIn,
        jwtid: jwtId
      }, (err, token) => {
        if (err) return reject(err);
        resolve(token);
      })
    });
  }

  before('connect to redis', function* () {
    RedisClient = require('../.././redisClient').connect();
    yield new Promise((resolve, reject) => {
      RedisClient.on('error', err => {
        reject(err);
      });
      RedisClient.on('ready', () => {
        resolve();
      });
    });
  });

  after('quit redis connection', function*() {
    yield RedisClient.quit();
  });

  describe('createSession()', () => {
    it('userInfo parameter is not nullable', function* () {
      try {
        yield RestSession.createSession(createContext());
      } catch (e) {
        (e instanceof PlanerError.InvalidParameterError).should.be.true;
      }
    });

    describe('when create session successfully', () => {
      var createResult;
      var userInfo = {
        email: 'foo@bar.com'
      };
      var context;

      before('create session', function*() {
        context = createContext();
        createResult = yield RestSession.createSession(context, userInfo);
      });

      after('clean session', function*() {
        yield RedisClient.client.DEL(`${RestSession.sid_redis_prefix}${createResult.sid}`);
      });

      it('token should appear in cookies', function() {
        (context.cookies.get(RestSession.token_cookie_key) === '').should.be.false;
      });

      it('token payload should contain jti field, exp field and sid', function() {
        var tokenInCookie = context.cookies.get(RestSession.token_cookie_key);
        var tokenPayload = jwt.decode(tokenInCookie);

        (tokenPayload.hasOwnProperty('jti')).should.be.true;
        tokenPayload.jti.should.be.equal(createResult.jwtId);

        (tokenPayload.hasOwnProperty('exp')).should.be.true;

        (tokenPayload.data.hasOwnProperty('sid')).should.be.true;
        tokenPayload.data.sid.should.be.equal(createResult.sid);
      });

      it('sid should be stored in redis, and contain current token and userinfo', function*() {
        var sidTimeout = ms(PlanerConfig.getString('programs/JWT/timeout')) / 1000;
        var sidKeyInRedis = `${RestSession.sid_redis_prefix}${createResult.sid}`;

        (yield context.app.redisClient.client.EXISTS(sidKeyInRedis)).should.be.equal(1);

        let sidTTL = yield context.app.redisClient.client.TTL(sidKeyInRedis);
        sidTTL.should.not.be.equal(-1);
        sidTTL.should.be.at.most(sidTimeout);

        (yield context.app.redisClient.client.HGET(sidKeyInRedis, 'jwtId')).should.be.equal(createResult.jwtId);
      });
    });
  });

  describe('refreshToken()', () => {
    it('sid parameter is not nullable', function*() {
      try {
        yield RestSession.refreshToken(createContext());
      } catch (e) {
        (e instanceof PlanerError.InvalidParameterError).should.be.true;
      }
    });

    describe('when refresh token successfully', ()=> {
      var context;
      var createSessionResult;
      var refreshTokenResult;
      var userInfo = {
        email: 'foo@bar.com'
      };

      before('create session and refresh token', function*() {
        context = createContext();
        createSessionResult = yield RestSession.createSession(context, userInfo);
        refreshTokenResult = yield RestSession.refreshToken(context, createSessionResult.sid, createSessionResult.jwtId);
      });

      after('clean session', function*() {
        yield context.app.redisClient.client.DEL(`${RestSession.sid_redis_prefix}${createSessionResult.sid}`);
        yield context.app.redisClient.client.DEL(`${RestSession.token_blacklist_redis_prefix}${createSessionResult.jwtId}`);
      });

      it('old jwt id stored in blacklist with sid and auto expiration', function*() {
        var jtiBlacklistKeyInRedis = `${RestSession.token_blacklist_redis_prefix}${createSessionResult.jwtId}`;
        var blacklistGraceTime = ms(PlanerConfig.getString('programs/JWT/lifetime-grace-time')) / 1000;
        (yield context.app.redisClient.client.EXISTS(jtiBlacklistKeyInRedis)).should.be.equal(1);

        var blacklistTTL = yield context.app.redisClient.client.TTL(jtiBlacklistKeyInRedis);
        (blacklistTTL).should.not.be.equal(-1);
        (blacklistTTL).should.be.at.most(blacklistGraceTime);

        (yield context.app.redisClient.client.GET(jtiBlacklistKeyInRedis)).should.be.equal(createSessionResult.sid);
      });

      it('new token should appear in cookies', function* () {
        context.cookies.get(RestSession.token_cookie_key).should.not.be.equal('');
      });

      it('session in redis has new jwt id', function*() {
        (yield context.app.redisClient.client.HGET(`${RestSession.sid_redis_prefix}${createSessionResult.sid}`, 'jwtId')).should.be.equal(refreshTokenResult.jwtId);
      });
    });
  });

  describe('refreshTokenByCookie()', () => {

  });

  describe('refreshSession()', () => {
    var context;
    var createSessionResult;

    before('create session', function*() {
      context = createContext();
      createSessionResult = yield RestSession.createSession(context, {email: 'foo@bar.com'});
    });

    after('clean session', function*() {
      yield RedisClient.client.DEL(`${RestSession.sid_redis_prefix}${createSessionResult.sid}`);
    });

    it('session ttl should be smaller than config timeout', function*() {
      yield RestSession.refreshSession(context, createSessionResult.sid);

      let sidTTL = yield context.app.redisClient.client.TTL(`${RestSession.sid_redis_prefix}${createSessionResult.sid}`);
      sidTTL.should.not.be.equal(-1);
      sidTTL.should.be.at.most(ms(PlanerConfig.getString('programs/JWT/timeout')) / 1000);
    });

    it('it session not exited, throw error', function*() {
      try {
        yield RestSession.refreshSession(context, uuid.v4());
      } catch(e) {
        PlanerError.BasicError.info(e).code.should.be.equal(PlanerError.CODE.FA_INVALID_SESSION);
      }

    });
  });

  describe('destroySession()', () => {
    var context;
    var userInfo = { email: 'foo@bar.com' };
    var createResult;

    before('create session and destroy it', function* () {
      context = createContext();
      createResult = yield RestSession.createSession(context, userInfo);

      yield RestSession.destroySession(context);
    });

    it('no token value in cookies', function() {
      (context.cookies.get(RestSession.token_cookie_key)).should.be.equal('');
    });

    it('no session stored in redis', function*() {
      (yield context.app.redisClient.client.EXISTS(`${RestSession.sid_redis_prefix}${createResult.sid}`)).should.be.equal(0);
    });

  });

  describe('verifySession()', () => {
    var context;
    var sid;

    before('create session', function*() {
      context = createContext();
      ({ sid } = yield RestSession.createSession(context, { email: 'foo@bar.com' }));
    });

    after('clean session', function*() {
      yield RestSession.destroySession(context);
    });

    it('verify failed when no token in cookies', function*() {
      var tokenInCookiesBak = RestSession.cookieStore.get(context);
      RestSession.cookieStore.reset(context);

      let verifyResult = yield RestSession.verifySession(context);
      verifyResult.errorCode.should.be.equal(PlanerError.CODE.FA_TOKEN_NOT_FOUND);

      RestSession.cookieStore.set(context, tokenInCookiesBak);
    });

    it('verify failed when token expired', function*() {
      var tokenInCookiesBak = RestSession.cookieStore.get(context);

      var jwtId = yield context.app.redisClient.client.HGET(`${RestSession.sid_redis_prefix}${sid}`, 'jwtId');
      var expiredToken = yield signToken(sid, jwtId, undefined, -1);

      RestSession.cookieStore.set(context, expiredToken);

      let verifyResult = yield RestSession.verifySession(context);
      verifyResult.errorCode.should.be.equal(PlanerError.CODE.FA_TOKEN_EXPIRED);
      (verifyResult.hasOwnProperty('expiredAt')).should.be.true;

      RestSession.cookieStore.set(context, tokenInCookiesBak);
    });

    it('verify failed when sid contained in token is not existed', function*() {
      var tokenInCookiesBak = RestSession.cookieStore.get(context);

      var invalidToken = yield signToken(uuid.v4(), uid.sync(6));

      RestSession.cookieStore.set(context, invalidToken);

      let verifyResult = yield RestSession.verifySession(context);
      verifyResult.errorCode.should.be.equal(PlanerError.CODE.FA_INVALID_SESSION);

      RestSession.cookieStore.set(context, tokenInCookiesBak);
    });

    it('verify successfully when token id is the current id of session', function*() {
      var verifyResult = yield RestSession.verifySession(context);

      (verifyResult.errorCode == null).should.be.true;
      verifyResult.sid.should.be.equal(sid);

      (yield context.app.redisClient.client.HGET(`${RestSession.sid_redis_prefix}${sid}`, 'jwtId')).should.be.equal(verifyResult.jwtId);
      JSON.stringify(verifyResult.tokenData).should.be.equal(JSON.stringify({sid}));
      (!!verifyResult.inBlacklist).should.be.false;
    });

    it('verify failed when blacklist do not contain the given token id', function*() {
      var oldToken = RestSession.cookieStore.get(context);
      var oldTokenId = yield context.app.redisClient.client.HGET(`${RestSession.sid_redis_prefix}${sid}`, 'jwtId');

      yield RestSession.refreshTokenByCookie(context);

      var newToken = RestSession.cookieStore.get(context);
      RestSession.cookieStore.set(context, oldToken);

      yield context.app.redisClient.client.DEL(`${RestSession.token_blacklist_redis_prefix}${oldTokenId}`);

      let verifyResult = yield RestSession.verifySession(context);

      verifyResult.errorCode.should.be.equal(PlanerError.CODE.FA_INVALID_TOKEN);

      RestSession.cookieStore.set(context, newToken);
    });

    it('verify failed when the sid of token id which in the blacklist does not equal the current session id', function*() {
      var oldToken = RestSession.cookieStore.get(context);
      var oldTokenId = yield context.app.redisClient.client.HGET(`${RestSession.sid_redis_prefix}${sid}`, 'jwtId');

      yield RestSession.refreshTokenByCookie(context);

      var newToken = RestSession.cookieStore.get(context);
      RestSession.cookieStore.set(context, oldToken);

      yield context.app.redisClient.client.SET(`${RestSession.token_blacklist_redis_prefix}${oldTokenId}`, uuid.v4());

      let verifyResult = yield RestSession.verifySession(context);

      verifyResult.errorCode.should.be.equal(PlanerError.CODE.FA_INVALID_TOKEN);

      RestSession.cookieStore.set(context, newToken);
    });

    it('verify successfully when the sid of token id which in the blacklist equal the current session id', function*() {
      var oldToken = RestSession.cookieStore.get(context);
      var oldTokenId = yield context.app.redisClient.client.HGET(`${RestSession.sid_redis_prefix}${sid}`, 'jwtId');

      yield RestSession.refreshTokenByCookie(context);

      var newToken = RestSession.cookieStore.get(context);

      RestSession.cookieStore.set(context, oldToken);

      let verifyResult = yield RestSession.verifySession(context);

      (verifyResult.errorCode == null).should.be.true;
      verifyResult.sid.should.be.equal(sid);
      (yield context.app.redisClient.client.HGET(`${RestSession.sid_redis_prefix}${sid}`, 'jwtId')).should.not.be.equal(verifyResult.jwtId);
      oldTokenId.should.be.equal(verifyResult.jwtId);
      JSON.stringify(verifyResult.tokenData).should.be.equal(JSON.stringify({sid}));
      (!!verifyResult.inBlacklist).should.be.true;

      RestSession.cookieStore.set(context, newToken);
    });
  });
});
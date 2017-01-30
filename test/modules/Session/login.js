/**
 * Created by samhwawng1990@gmail.com on 2017/1/23.
 */

'use strict';

const PlanerError = require('../../../modules/Error');
const LoginSession = require('../../../modules/Session/login');

describe('Login temp session testing', function() {
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

  before('connect to redis', function* () {
    RedisClient = require('../../../connect_client/redisClient').connect();
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

  describe('verifySession()', () => {
    it('if cookies have no temp login sid, return error', function*() {
      var verifyResult = yield LoginSession.verifySession.call(createContext());
      verifyResult.errorCode.should.be.equal(PlanerError.CODE.FA_EMPTY_LOGIN_SESSION);
    });

    it('if cookies have no login nonce, return error', function*() {
      var context = createContext();
      context.cookies.set(LoginSession.login_sid_key, 'test');

      var verifyResult = yield LoginSession.verifySession.call(context);
      verifyResult.errorCode.should.be.equal(PlanerError.CODE.FA_INVALID_LOGIN_SESSION);
    });

    it('if temp login sid not existed in redis, return error', function*() {
      yield RedisClient.client.DEL(`${LoginSession.login_sid_prefix}test_sid`);

      var context = createContext();
      context.cookies.set(LoginSession.login_sid_key, 'test_sid');
      context.cookies.set(LoginSession.login_nonce_key, 'test_nonce');

      var verifyResult = yield LoginSession.verifySession.call(context);
      verifyResult.errorCode.should.be.equal(PlanerError.CODE.FA_INVALID_LOGIN_SESSION);
    });

    it('if nonce don\'t match the current nonce of temp login sid, return error', function*() {
      yield RedisClient.client.DEL(`${LoginSession.login_sid_prefix}test_sid`);

      var context = createContext();
      context.cookies.set(LoginSession.login_sid_key, 'test_sid');
      context.cookies.set(LoginSession.login_nonce_key, 'test_nonce');

      yield RedisClient.client.HSET(`${LoginSession.login_sid_prefix}test_sid`, 'nonce', '123');
      var verifyResult = yield LoginSession.verifySession.call(context);
      verifyResult.errorCode.should.be.equal(PlanerError.CODE.FA_INVALID_LOGIN_SESSION);
    });

    it('if nonce match the current nonce of temp login sid, no error return', function*() {
      yield RedisClient.client.DEL(`${LoginSession.login_sid_prefix}test_sid`);

      var context = createContext();
      context.cookies.set(LoginSession.login_sid_key, 'test_sid');
      context.cookies.set(LoginSession.login_nonce_key, 'test_nonce');

      yield RedisClient.client.HSET(`${LoginSession.login_sid_prefix}test_sid`, 'nonce', 'test_nonce');
      var verifyResult = yield LoginSession.verifySession.call(context);
      (verifyResult.errorCode == null).should.be.true;
    });
  });

  describe('cleanSession()', () => {
    it('nonce and sid cookies should be empty', function*() {
      var context = createContext();
      context.cookies.set(LoginSession.login_sid_key, 'test_sid');
      context.cookies.set(LoginSession.login_nonce_key, 'test_nonce');

      yield LoginSession.cleanSession.call(context);
      (context.cookies.get(LoginSession.login_sid_key) === '').should.be.true;
      (context.cookies.get(LoginSession.login_nonce_key) === '').should.be.true;
    });

    it('try to clean temp sid in redis', function*() {
      var context = createContext();
      context.cookies.set(LoginSession.login_sid_key, 'test_sid');
      context.cookies.set(LoginSession.login_nonce_key, 'test_nonce');

      yield RedisClient.client.HSET(`${LoginSession.login_sid_prefix}test_sid`, 'nonce', 'test_nonce');

      yield LoginSession.cleanSession.call(context);
      ((yield RedisClient.client.GET(`${LoginSession.login_sid_prefix}test_id`)) == null).should.be.true;
    });
  });

  describe('createSession()', () => {
    var context;
    var createResult;

    before('prepare data', function*() {
      context = createContext();
      createResult = yield LoginSession.createSession.call(context);
    });

    after('delete data', function*() {
      yield RedisClient.client.DEL(`${LoginSession.login_sid_prefix}${createResult.tsid}`);
    });

    it('add new sid and nonce to redis', function*() {
      (yield RedisClient.client.EXISTS(`${LoginSession.login_sid_prefix}${createResult.tsid}`)).should.be.equal(1);
      (yield RedisClient.client.HGET(`${LoginSession.login_sid_prefix}${createResult.tsid}`, 'nonce')).should.be.equal(createResult.nonce);
    });

    it('new sid is auto expired in 5 minutes', function*() {
      var sidTTL = yield RedisClient.client.TTL(`${LoginSession.login_sid_prefix}${createResult.tsid}`);
      sidTTL.should.not.be.equal(-1);
      sidTTL.should.be.at.most(5*60);
    });

    it('add new sid and nonce to cookies', function() {
      context.cookies.get(LoginSession.login_sid_key).should.be.equal(createResult.tsid);
      context.cookies.get(LoginSession.login_nonce_key).should.be.equal(createResult.nonce);
    });
  });

  describe('updateNonce()', () => {
    var context;
    var createResult;
    var updateResult;

    before('prepare data', function*() {
      context = createContext();
      createResult = yield LoginSession.createSession.call(context);
      updateResult = yield LoginSession.updateNonce.call(context);
    });

    after('delete data', function*() {
      yield RedisClient.client.DEL(`${LoginSession.login_sid_prefix}${createResult.tsid}`);
    });

    it('new nonce has stored in redis', function*() {
      (yield RedisClient.client.HGET(`${LoginSession.login_sid_prefix}${createResult.tsid}`, 'nonce')).should.be.equal(updateResult.nonce);
    });

    it('new nonce has set in cookies', function() {
      context.cookies.get(LoginSession.login_sid_key).should.be.equal(createResult.tsid);
      context.cookies.get(LoginSession.login_nonce_key).should.be.equal(updateResult.nonce);
    })
  });


});
/**
 * Created by samhwawng1990@gmail.com on 2017/1/23.
 */

'use strict';

describe('Login temp session testing', function() {
  var RedisClient;

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

  });

  describe('cleanSession()', () => {

  });

  describe('createSession()', () => {

  });

  describe('updateNonce()', () => {

  });


});
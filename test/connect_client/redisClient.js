/**
 * Created by samhwang1990@gmail.com on 17/1/19.
 */

'use strict';

describe('redis connect', () => {
  var redisStore;

  after('quit client', () => {
    if (redisStore) {
      redisStore.quit();
    }
  });

  it('shall connect and ready with default config', done => {
    redisStore = require('.././redisClient').connect();
    redisStore.on('error', err => {
      done(err);
    });
    redisStore.on('ready', () => {
      done();
    });
  })
});
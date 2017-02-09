/**
 * Created by samhwang1990@gmail.com on 17/2/5.
 */

'use strict';

const RedisConnectClient = require('../connect_client/redis');

class PlanerApplication {
  constructor(koaApplication) {
    this.app = koaApplication;
  }

  *getRedisClient() {
    if (!this.redisClient) {
      // 这里没有接受和区分redis connect 的error, 会导致即使连接失败,也会不断尝试
      this.redisStore = yield new Promise((resolve, reject) => {
        let redisStore = RedisConnectClient.connect();
        redisStore.on('error', err => {
          reject(err);
        });
        redisStore.on('ready', () => {
          resolve(redisStore);
        });
      });
    }

    return this.redisStore.client;
  }

  static getInstance(koaApplication) {
    if (!koaApplication.planerApp || !(koaApplication.planerApp instanceof PlanerApplication)) {
      koaApplication.planerApp = new PlanerApplication(koaApplication);
    }
    return koaApplication.planerApp;
  }
}

module.exports = PlanerApplication;
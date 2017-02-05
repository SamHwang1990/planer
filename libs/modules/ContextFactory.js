/**
 * Created by samhwang1990@gmail.com on 17/2/5.
 */

'use strict';

const SessionClient = require('./SessionClient');
const ApplicationFactory = require('./ApplicationFactory');

class PlanerContext {
  constructor(koaContext) {
    this.context = koaContext;
    this.app = koaContext.app;
    this.planerApp = ApplicationFactory.getInstance(this.app);
  }

  *getRedisClient() {
    return (yield this.planerApp.getRedisClient());
  }

  *getSessionClient() {
    if (!this.session || !(this.session instanceof SessionClient)) {
      // todo: context.sid 可以不存在,取而代之的是在这里进行jwt 和session 鉴权
      this.session = yield SessionClient.restoreRestSession(this.context, this.context.sid, (yield this.getRedisClient()));
    }

    return this.session;
  }

  static getInstance(koaContext) {
    if (!koaContext.planerContext || !(koaContext.planerContext instanceof PlanerContext)) {
      koaContext.planerContext = new PlanerContext(koaContext);
    }

    return koaContext.planerContext;
  }
}

module.exports = PlanerContext;
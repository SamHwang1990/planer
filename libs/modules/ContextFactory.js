/**
 * Created by samhwang1990@gmail.com on 17/2/5.
 */

'use strict';

const SessionClient = require('./SessionClient');
const ApplicationFactory = require('./ApplicationFactory');
const PlanerError = require('../utils/error');

const restJsonWebTokenHelpers = require('./TokenHelpers/restJsonWebToken');

const UserInfoDal = require('../dal/user_info');

class PlanerContext {
  constructor(koaContext) {
    this.context = koaContext;
    this.app = koaContext.app;
    this.planerApp = ApplicationFactory.getInstance(this.app);
  }

  *getRedisClient() {
    return (yield this.planerApp.getRedisClient());
  }

  *getRestSession() {
    if (!this._session || !(this._session instanceof SessionClient)) {
      let verifyResult = yield restJsonWebTokenHelpers.verifyToken(this);

      if (verifyResult.errorCode != null) {
        throw new PlanerError.AuthorizationError(
            { info: { code: verifyResult.errorCode }},
            verifyResult.errorMsg || ''
        );
      }

      this._session = yield SessionClient.restoreRestSession(this, verifyResult.sid, (yield this.getRedisClient()));
    }

    return this._session;
  }

  setRestSession(sessionClient) {
    if (sessionClient instanceof SessionClient) {
      this._session = sessionClient;
    }
  }

  *getUser() {
    if (!this._user) {
      let session = yield this.getRestSession();
      let user_email = yield session.getAttr('user_email');
      this._user = yield UserInfoDal.query({email: user_email});
    }
    return this._user;
  }

  setUser(userInfo = {}) {
    if (userInfo.hasOwnProperty('email')) {
      this._user = userInfo;
    }
  }

  static getInstance(koaContext) {
    if (!koaContext.planerContext || !(koaContext.planerContext instanceof PlanerContext)) {
      koaContext.planerContext = new PlanerContext(koaContext);
    }

    return koaContext.planerContext;
  }
}

module.exports = PlanerContext;
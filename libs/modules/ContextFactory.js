/**
 * Created by samhwang1990@gmail.com on 17/2/5.
 */

'use strict';

const SessionClient = require('./SessionClient');
const ApplicationFactory = require('./ApplicationFactory');
const PlanerError = require('../utils/error');

const JsonWebTokenHelpers = require('./JsonWebToken');

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

  *getSessionClient() {
    if (!this._session || !(this._session instanceof SessionClient)) {
      let verifyResult = yield this.verifyAuthenticationToken();
      this._session = yield SessionClient.restoreRestSession(this, verifyResult.sid, (yield this.getRedisClient()));
    }

    return this._session;
  }

  *setSessionClient(sessionClient) {
    if (sessionClient instanceof SessionClient) {
      this._session = sessionClient;
    }
  }

  *getUser() {
    if (!this._user) {
      let session = yield this.getSessionClient();
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

  *verifyAuthenticationToken() {
    var verifyResult = yield JsonWebTokenHelpers.verifyToken(this);
    if (verifyResult.errorCode != null) {
      throw new PlanerError.AuthorizationError(
          { info: { code: verifyResult.errorCode }},
          verifyResult.errorMsg || ''
      );
    }
    return verifyResult;
  }

  *createAuthenticationToken() {
    return (yield JsonWebTokenHelpers.createToken(this));
  }

  *cleanAuthenticationToken() {
    return (yield JsonWebTokenHelpers.cleanToken(this));
  }

  *refreshAuthenticationToken() {
    return (yield JsonWebTokenHelpers.refreshToken(this));
  }

  static getInstance(koaContext) {
    if (!koaContext.planerContext || !(koaContext.planerContext instanceof PlanerContext)) {
      koaContext.planerContext = new PlanerContext(koaContext);
    }

    return koaContext.planerContext;
  }
}

module.exports = PlanerContext;
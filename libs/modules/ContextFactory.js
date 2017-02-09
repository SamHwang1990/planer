/**
 * Created by samhwang1990@gmail.com on 17/2/5.
 */

'use strict';

const SessionClient = require('./SessionClient');
const ApplicationFactory = require('./ApplicationFactory');
const PlanerError = require('../utils/error');

const restJsonWebTokenHelpers = require('./TokenHelpers/restJsonWebToken');

const UserContext = require('./UserInfo');

const PrivateProperties = {
  user: new WeakMap(),
  session: new WeakMap()
};

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
    let session = PrivateProperties.session.get(this);

    if (!session || !(session instanceof SessionClient)) {
      let verifyResult = yield restJsonWebTokenHelpers.verifyToken(this);

      if (verifyResult.errorCode != null) {
        throw new PlanerError.AuthorizationError(
            { info: { code: verifyResult.errorCode }},
            verifyResult.errorMsg || ''
        );
      }

      session = yield SessionClient.restoreRestSession(this, verifyResult.sid, (yield this.getRedisClient()));
      PrivateProperties.session.set(this, session);
    }

    return session;
  }

  setRestSession(sessionClient) {
    if (sessionClient instanceof SessionClient) {
      PrivateProperties.session.set(this, sessionClient);
    }
  }

  *getUser() {
    let user = PrivateProperties.user.get(this);
    if (!user || !(user instanceof UserContext)) {
      let session = yield this.getRestSession();
      let user_email = yield session.getAttr('user_email');

      user = yield UserContext.restoreUser({email: user_email});
      PrivateProperties.user.set(this, user);
    }
    return user;
  }

  setUser(userContext = {}) {
    if (userContext instanceof UserContext) {
      PrivateProperties.user.set(this, userContext);
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
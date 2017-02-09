/**
 * Created by sam on 17/1/8.
 */

'use strict';

const PlanerError = require('../Error');

const SessionClient = require('../SessionClient');
const UserContext = require('../UserInfo');

function *login(planerContext, {email, password} = {}) {
  if (!email) throw new PlanerError.InvalidParameterError('login failed: email can not be empty');
  if (!password) throw new PlanerError.InvalidParameterError('login failed: password can not be empty');

  let user = yield UserContext.restoreUser({email});
  let isPasswordMatch = yield user.verifyPassword(password);

  if (!isPasswordMatch) throw new PlanerError.AuthorizationError('login failed: password incorrect');

  let session = SessionClient.newRestSession(planerContext, (yield planerContext.getRedisClient()), (yield user.getUserInfo()));

  planerContext.setRestSession(session);
  planerContext.setUser(user);

  return session;
}

function *logout(planerContext) {
  let session = yield planerContext.getRestSession();
  if (session) {
    yield session.destroySession();
  }
}

module.exports = {
  login,
  logout
};
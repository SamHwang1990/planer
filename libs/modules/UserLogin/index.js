/**
 * Created by sam on 17/1/8.
 */

'use strict';

const PlanerError = require('../Error');
const {
    UserInfo: UserInfoDal,
    UserPassword: UserPasswordDal
} = require('../../dal');

const SessionClient = require('../SessionClient');

function *login(planerContext, {email, password} = {}) {
  if (!email) throw new PlanerError.InvalidParameterError('login failed: email can not be empty');
  if (!password) throw new PlanerError.InvalidParameterError('login failed: password can not be empty');

  var userInfo = yield UserInfoDal.query({email});
  if (userInfo == null) throw new PlanerError.BasicError({info: {code: PlanerError.CODE.FA_USER_NOT_FOUND}}, `login failed: user not found with ${email}`);

  var isPasswordMatch = yield UserPasswordDal.checkPassword({user_email: email, password});
  if (!isPasswordMatch) throw new PlanerError.AuthorizationError('login failed: password incorrect');

  var session = SessionClient.newRestSession(planerContext, (yield planerContext.getRedisClient()), userInfo);

  planerContext.setRestSession(session);
  planerContext.setUser(userInfo);

  return session;
}

function *logout(planerContext) {
  var session = yield planerContext.getRestSession();
  if (session) {
    yield session.destroySession();
  }
}

module.exports = {
  login,
  logout
};
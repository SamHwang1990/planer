/**
 * Created by sam on 17/1/8.
 */

'use strict';

const RestSession = require('../Session/rest');
const LoginSession = require('../Session/login');
const PlanerError = require('../Error');
const APIBase = require('../API/index');
const {
    UserInfo: UserInfoDal,
    UserPassword: UserPasswordDal
} = require('../../dal');

exports.login = function*({email, password} = {}) {
  if (!email) throw new PlanerError.InvalidParameterError('login failed: email can not be empty');
  if (!password) throw new PlanerError.InvalidParameterError('login failed: password can not be empty');

  var userInfo = yield UserInfoDal.query({email});
  if (userInfo == null) throw new PlanerError.BasicError({info: {code: PlanerError.CODE.FA_USER_NOT_FOUND}}, `login failed: user not found with ${email}`);

  var isPasswordMatch = yield UserPasswordDal.checkPassword({user_email: email, password});
  if (!isPasswordMatch) throw new PlanerError.AuthorizationError('login failed: password incorrect');

  yield LoginSession.cleanSession();
  yield RestSession.createSession(this, userInfo);
  return APIBase.exportResult(APIBase.exportCode.S_OK);
};

exports.logout = function*() {
  yield RestSession.destroySession(this);
  return APIBase.exportResult(APIBase.exportCode.S_OK);
};
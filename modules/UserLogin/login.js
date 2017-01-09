/**
 * Created by sam on 17/1/8.
 */

'use strict';

const SessionStore = require('../Session');
const PlanerError = require('../Error');
const APIBase = require('../API');
const {
    UserInfo: UserInfoDal,
    UserPassword: UserPasswordDal
} = require('../../dal');

module.exports = function* login({email, password}) {
  if (!email) throw new PlanerError.InvalidParameterError('login failed: email can not be empty');
  if (!password) throw new PlanerError.InvalidParameterError('login failed: password can not be empty');

  var userInfo = yield UserInfoDal.query({email});
  var userPasswordInfo = yield UserPasswordDal.query(userInfo.id);

  if (!userPasswordInfo.password !== password) throw new PlanerError.AuthorizationError('login failed: password incorrect');

  yield SessionStore.create(userInfo);
  yield APIBase.exportResult(APIBase.exportCode.S_OK, {user: userInfo});
};
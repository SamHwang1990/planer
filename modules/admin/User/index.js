/**
 * Created by samhwawng1990@gmail.com on 2017/1/3.
 */

"use strict";

const {
  UserInfo: UserInfoDal,
  UserPassword: UserPasswordDal
} = require('../../dal/index');

const PlanerError = require('.././error');
const APIBase = require('.././API/index');

function* createUser() {
  var { email, nickname, status, remark, } = this.request.body;

  if (!email) {
    throw new PlanerError.InvalidParameterError('create user failed: email parameter can not be empty.');
  }

  let newUser = yield UserInfoDal.create({email, nickname, status, remark});

  delete newUser.group_id;
  delete newUser._id;
  delete newUser.id;

  return APIBase.exportResult(APIBase.exportCode.S_OK, newUser);
}

function* updateUserInfo() {
  var { email, nickname, status, remark, } = this.request.body;

  if (!email) {
    throw new PlanerError.InvalidParameterError('update user failed: email parameter can not be empty.');
  }

  var obsoleteInfo = yield UserInfoDal.update({email, nickname, status, remark});
  return APIBase.exportResult(APIBase.exportCode.S_OK, {obsoleteInfo});
}

function* deleteUser() {
  var { email } = this.request.body;

  var deleteUserInfoResult = yield UserInfoDal.remove({email});
  if (deleteUserInfoResult.ok !== 1) {
    throw new PlanerError.BasicError(
        { info: { deleteUserInfoResult } },
        'delete user info operation executed incorrectly.');
  }

  try {
    var deleteUserPasswordResult = yield UserPasswordDal.cleanPassword({email});
  } catch (e) {
    throw new PlanerError.BasicError({
      cause: e,
      info: { code: APIBase.exportCode.PARTIAL_OK }
    }, 'clean user password failed during deleting user.');
  }

  return APIBase.exportResult(APIBase.exportCode.S_OK, {
    deleteUserInfoResult,
    deleteUserPasswordResult
  });
}

function* getUserInfo() {
  var { email } = this.request.body;

  return yield UserInfoDal.query({ email });
}

function* createUserPassword() {
  var { email, password } = this.request.body;

  yield UserPasswordDal.updatePassword({email, password});
}

function* createUserInfoAndPassword() {
  var newUser = yield createUser;
  try {
    yield createUserPassword;
  } catch (e) {
    yield deleteUser;
    throw e;
  }
  return newUser;
}

function* updateUserPassword() {
  var { email, password } = this.request.body;
  yield UserPasswordDal.updatePassword({email, password});
  return APIBase.exportResult(APIBase.exportCode.S_OK);
}

module.exports = {
  createUser,
  updateUserInfo,
  deleteUser,
  getUserInfo,

  createUserPassword,
  createUserInfoAndPassword,
  updateUserPassword
};
/**
 * Created by samhwawng1990@gmail.com on 2017/1/3.
 */

"use strict";

const {
  UserInfo: UserInfoDal,
  UserPassword: UserPasswordDal
} = require('../../../libs/dal/index');

const PlanerError = require('../../../libs/utils/error');
const APIBase = require('../../../libs/modules/API/index');

function* createUser() {
  let { email, nickname, status, remark, } = this.request.body;

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
  let { email, nickname, status, remark, } = this.request.body;

  if (!email) {
    throw new PlanerError.InvalidParameterError('update user failed: email parameter can not be empty.');
  }

  let obsoleteInfo = yield UserInfoDal.update({email, nickname, status, remark});
  return APIBase.exportResult(APIBase.exportCode.S_OK, {obsoleteInfo});
}

function* deleteUser() {
  let { email } = this.request.body;

  let deleteUserInfoResult = yield UserInfoDal.remove({email});
  if (deleteUserInfoResult.ok !== 1) {
    throw new PlanerError.BasicError(
        { info: { deleteUserInfoResult } },
        'delete user info operation executed incorrectly.');
  }

  let deleteUserPasswordResult;
  try {
    deleteUserPasswordResult = yield UserPasswordDal.cleanPassword({email});
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
  let { email } = this.request.body;

  return yield UserInfoDal.query({ email });
}

function* createUserPassword() {
  let { email, password } = this.request.body;

  yield UserPasswordDal.updatePassword({email, password});
}

function* createUserInfoAndPassword() {
  let newUser = yield createUser;
  try {
    yield createUserPassword;
  } catch (e) {
    yield deleteUser;
    throw e;
  }
  return newUser;
}

function* updateUserPassword() {
  let { email, password } = this.request.body;
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
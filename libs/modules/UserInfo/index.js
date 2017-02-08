/**
 * Created by samhwang1990@gmail.com on 17/2/4.
 */

'use strict';

const {
    UserInfo: UserInfoDal,
    UserPassword: UserPasswordDal
} = require('../../dal');

const {
    UserInfo: UserInfoModel,
    UserPassword: UserPasswordModel
} = require('../../models');

const PlanerError = require('.././error');

class User {
  constructor(email) {
    this.email = email;
  }

  *getUserInfo() {
    if (!this._userInfo) {
      this._userInfo = yield UserInfoDal.query({email: this.email});
    }

    return this._userInfo;
  }

  *updateUserInfo() {

  }

  *destroyUser() {

  }

  *upsertUserPassword() {

  }

  *cleanUserPassword() {

  }

  static *createUserInfo(userInfo = {}) {
    if (!(userInfo instanceof UserInfoModel)) {
      userInfo = new UserInfoModel(userInfo);
    }

    // todo: validate document, and add common validate middleware

    yield UserInfoDal.create(userInfo);
    return new User(userInfo.get('email'));
  }

  static *registerUserInfo({email, nickname, status, remark, password} = {}) {

  }

  static *restoreUserInfo({email} = {}) {

  }
}

module.exports = User;

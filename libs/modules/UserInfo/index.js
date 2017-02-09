/**
 * Created by samhwang1990@gmail.com on 17/2/4.
 */

'use strict';

const {
    UserInfo: UserInfoDal,
    UserPassword: UserPasswordDal,
    DocumentUpdateExecutor
} = require('../../dal');

const {
    UserInfo: UserInfoModel
} = require('../../models');

const PlanerError = require('../../utils/error');

// User Class 的私有属性
const PrivateProperties = {
  userInfoDocument: new WeakMap()
};

class User {
  constructor(email) {
    this.email = email;
  }

  *getUserInfo(toObject = true) {
    let userInfoDoc = PrivateProperties.userInfoDocument.get(this);

    if (userInfoDoc === undefined) {
      userInfoDoc = yield UserInfoDal.query({email: this.email});
      PrivateProperties.userInfoDocument.set(this, userInfoDoc);
    }

    if (toObject === false) {
      return userInfoDoc;
    } else {
      return userInfoDoc.toObject();
    }
  }

  *prepareUpdateUserInfo() {
    return DocumentUpdateExecutor.newExecutor(yield this.getUserInfo(false), function userInfoPathFilter(path) {
      return ['email', '_id'].indexOf(path) < 0;
    });
  }

  *isExisted() {
    return (yield this.getUserInfo()) != null;
  }

  *verifyPassword(password) {
    return yield UserPasswordDal.checkPassword({user_email: this.email, password});
  }

  *upsertPassword(password) {
    return yield UserPasswordDal.updatePassword({email: this.email, password});
  }

  *cleanPassword() {
    let cleanResult = yield UserPasswordDal.cleanPassword({email: this.email});

    if (cleanResult.ok !== 1) {
      throw new PlanerError.BasicError(
          { info: { user_email: this.email, cleanResult } },
          'clean user password info operation executed incorrectly.');
    }

    return cleanResult;
  }

  static *createUserInfo(userInfo = {}) {
    if (!(userInfo instanceof UserInfoModel)) {
      userInfo = new UserInfoModel(userInfo);
    }

    // todo: validate document, and add common validate middleware

    yield UserInfoDal.create(userInfo);
    return new User(userInfo.get('email'));
  }

  static *deleteUser({email} = {}) {
    if (!email) {
      throw new PlanerError.InvalidParameterError('delete user failed: email parameter can not be empty.');
    }

    let user = new User(email);

    try {
      yield user.cleanPassword();
    } catch (e) {
      // todo: log error
    }

    let deleteUserInfoResult = yield UserInfoDal.remove({email});
    if (deleteUserInfoResult.ok !== 1) {
      throw new PlanerError.BasicError(
          { info: { email, deleteUserInfoResult } },
          'delete user info operation executed incorrectly.');
    }
  }

  static *restoreUser({email} = {}) {
    if (!email) {
      throw new PlanerError.InvalidParameterError('delete user failed: email parameter can not be empty.');
    }

    let user = new User(email);

    if (yield user.isExisted()) {
      return user;
    } else {
      throw new PlanerError.BasicError(
          { info: { code: PlanerError.CODE.FA_USER_NOT_FOUND } },
          'restore user failed because of user not found.');
    }
  }
}

module.exports = User;

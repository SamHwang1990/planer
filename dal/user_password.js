/**
 * Created by sam on 16/12/27.
 */

"use strict";

const crypto = require('crypto');

const UserInfoDal = require('./user_info');
const UserPasswordModel = require('../models').UserPassword;
const PlanerError = require('../modules/Error');

function crypto_pbkdf2_thunk(password, salt) {
  return function(cb) {
    crypto.pbkdf2(password, salt, 4096, 256, 'sha256', cb);
  }
}

exports.updatePassword = function* updateUserPassword({email, password}) {
  if (email == null) throw new PlanerError.InvalidParameterError('update user password failed: email parameter can not be empty.');
  if (password == null) throw new PlanerError.InvalidParameterError('update user password failed: password parameter can not be empty.');

  var userInfo = yield UserInfoDal.query({email});
  if (userInfo == null) throw new PlanerError.BasicError({info: {code: PlanerError.CODE.FA_USER_NOT_FOUND}}, `update user password failed: user not found with ${email}`);

  function* newPasswordHistory(password) {
    let salt = crypto.randomBytes(256).toString('hex');
    let hashPassword = (yield crypto_pbkdf2_thunk(password, salt)).toString('hex');

    return {
      password: hashPassword,
      salt: salt,
      timeout: (Date.now()).getTime() + 366*24*60*60*1000
    }
  }

  var userPassword = yield UserPasswordModel.findOne({user_id: userInfo.id});

  if (userPassword == null) {
    let newPasswordInfo = yield newPasswordHistory(password);
    userPassword = yield UserPasswordModel.create({
      user_id: userInfo.id,
      password: newPasswordInfo.password,
      salt: newPasswordInfo.salt,
      history_password: [newPasswordInfo]
    });

    return {
      action: 'create',
      userPassword: userPassword
    }
  }

  let historyPassword = userPassword.history_password;
  let ondateHistory = [];

  if (historyPassword) {
    for (let history of historyPassword) {
      if (history.timeout <= new Date().getTime()) {
        continue;
      }

      ondateHistory.push(history);
      if (history.password === (yield crypto_pbkdf2_thunk(password, history.salt))) {
        throw new PlanerError.BasicError({info: {code: PlanerError.CODE.FA_PASSWORD_REPEATED}}, `update user password failed: password is repeated in one year.`);
      }
    }
    userPassword.history_password = ondateHistory;
  } else {
    userPassword.history_password = [];
  }

  let newPasswordInfo = yield newPasswordHistory(password);

  userPassword.password = newPasswordInfo.password;
  userPassword.salt = newPasswordInfo.salt;
  userPassword.history_password.push(newPasswordInfo);

  let updateResult = yield userPassword.save();
  return {
    action: 'update',
    userPassword: userPassword
  }
};

exports.checkPassword = function* checkUserPassword({email, password}) {
  if (email == null) throw new PlanerError.InvalidParameterError('check user password failed: email parameter can not be empty.');
  if (password == null) throw new PlanerError.InvalidParameterError('check user password failed: password parameter can not be empty.');

  var userInfo = yield UserInfoDal.query({email});
  if (userInfo == null) throw new PlanerError.BasicError({info: {code: PlanerError.CODE.FA_USER_NOT_FOUND}}, `check user password failed: user not found with ${email}`);

  var userPassword = yield UserPasswordModel.findOne({user_id: userInfo.id});
  if (userPassword == null) throw new PlanerError.BasicError({info: {code: PlanerError.CODE.FA_PASSWORD_EMPTY}}, `check user password failed: user ${email} has no password yet.`);

  password = (yield crypto_pbkdf2_thunk(password, userPassword.salt)).toString('hex');

  return password === userPassword.password;
};


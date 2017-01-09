/**
 * Created by sam on 16/12/27.
 */

"use strict";

const UserPasswordModel = require('../models').UserPassword;
const PlanerError = require('../modules/Error');

// todo: 大致梳理了更新密码需要的逻辑, 写得比较随便, 且数据库的更新机制和消耗未完全摸清, 需要重构
exports.updatePassword = function createUserInfo({userId, password}) {
  return new Promise((resolve, reject) => {
    if (userId == null) return reject(new PlanerError.InvalidParameterError(`update user password failed: parameter can not be empty.`));

    // todo: need to convert userId from string to ObjectId
    var userInCollection = UserPasswordModel.findOne({user_id: userId});
    userInCollection.then((err, userPasswordInfo) => {
      if (err) return reject(err);

      // todo: need to convert userId from string to ObjectId
      // todo: password need to be encrypted
      if (!userPasswordInfo) {
        UserPasswordModel.create({
          user_id: userId,
          password: password,
          history_password: [{
            password: password,
            created: new Date().getTime()
          }]
        }, function(err/*, userPasswordInfo*/) {
          if (err) return reject(err);

          resolve(userId);
        });
      } else {
        let now = new Date().getTime();
        let newHistory = [];
        let isPasswordRepeat = false;
        for (let [index, history] of userPasswordInfo.history_password.entries()) {
          if (history.created + 12 * 30 * 24 * 60 * 60 * 1000 > now) continue;
          newHistory.push(history);
          if (history.password == password) {
            isPasswordRepeat = true;
          }
        }
        userPasswordInfo.history_password = newHistory;
        UserPasswordModel.update(userPasswordInfo, err => {
          if (isPasswordRepeat) return reject(new PlanerError.InvalidParameterError(`update user password failed: password repeat in year`));
          if (err) return reject(err);
          resolve(userId);
        });
      }
    });

  });
};

// yield a thunk to co
exports.query = function(userId) {
  return function(cb) {
    UserPasswordModel.findOne({user_id: userId}, cb);
  }
};


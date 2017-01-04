/**
 * Created by sam on 16/12/27.
 */

// todo: 下一步要抛下单元测试,过下接口

const UserInfoModel = require('../models').UserInfo;
const PlanerError = require('../modules/Error');

exports.query = function queryUserInfo({email}) {
  return new Promise((resolve, reject) => {
    if (email == null) return reject(new PlanerError.DALParameterError(`query userinfo failed: parameter can not be empty.`));

    UserInfoModel.find({email: email}, (err, userInfo) => {
      if (err) return reject(err);
      resolve(userInfo);
    });
  });
};

exports.create = function createUserInfo(userInfo) {
  return new Promise((resolve, reject) => {
    if (userInfo == null) return reject(new PlanerError.DALParameterError(`create userinfo failed: parameter can not be empty.`));

    userInfo = Object.assign({status: 'active'}, userInfo);

    UserInfoModel.create(userInfo, function UserInfoModelCreateCallback(err, user) {
      if (err) return reject(err);
      resolve(user);
    });
  });
};

exports.update = function updateUserInfo(userInfo) {
  return new Promise((resolve, reject) => {
    if (userInfo == null) return reject(new PlanerError.DALParameterError(`update userinfo failed: parameter can not be empty.`));

    UserInfoModel.findOneAndUpdate({email: userInfo.email}, userInfo, err => {
      if (err) return reject(err);
      resolve(userInfo.email);
    });
  });
};

exports.delete = function updateUserInfo({email}) {
  return new Promise((resolve, reject) => {
    if (email == null) return reject(new PlanerError.DALParameterError(`delete userinfo failed: parameter can not be empty.`));

    UserInfoModel.findOneAndUpdate({email: email}, { status: 'destroy' }, err => {
      if (err) return reject(err);
      resolve(true);
    });
  });
};
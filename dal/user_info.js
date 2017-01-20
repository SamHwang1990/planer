/**
 * Created by sam on 16/12/27.
 */

// todo: 下一步要抛下单元测试,过下接口

const UserInfoModel = require('../models').UserInfo;
const PlanerError = require('../modules/Error');

exports.query = function queryUserInfo({email}) {
  return new Promise((resolve, reject) => {
    if (email == null) return reject(new PlanerError.InvalidParameterError(`query userinfo failed: parameter can not be empty.`));

    UserInfoModel.findOne({email: email}, (err, userInfo) => {
      if (err) return reject(err);
      resolve(userInfo);
    });
  });
};

exports.create = function createUserInfo(userInfo) {
  return new Promise((resolve, reject) => {
    if (userInfo == null) return reject(new PlanerError.InvalidParameterError(`create userinfo failed: parameter can not be empty.`));

    userInfo = Object.assign({status: 'active'}, userInfo);

    UserInfoModel.create(userInfo, function UserInfoModelCreateCallback(err, user) {
      if (err) return reject(err);
      resolve(user);
    });
  });
};

exports.update = function updateUserInfo(userInfo) {
  return new Promise((resolve, reject) => {
    if (userInfo == null) return reject(new PlanerError.InvalidParameterError(`update userinfo failed: parameter can not be empty.`));
    if (userInfo.email == null) return reject(new PlanerError.InvalidParameterError(`update userinfo failed: email key can not be empty.`));

    var condition = {
      email: userInfo.email
    };

    // email and group_id field shouldn't update in this api
    var updateMeta = Object.assign({}, userInfo);
    delete updateMeta.email;
    delete updateMeta.group_id;

    var projection = {
      '_id': 0,
      group_id: 0
    };

    UserInfoModel.findOneAndUpdate(condition, updateMeta, { fields: projection }, (err, user) => {
      if (err) return reject(err);
      resolve(user);
    });
  });
};

exports.delete = function updateUserInfo({email}) {
  return new Promise((resolve, reject) => {
    if (email == null) return reject(new PlanerError.InvalidParameterError(`delete userinfo failed: parameter can not be empty.`));

    UserInfoModel.findOneAndUpdate({email: email}, { status: 'destroy' }, err => {
      if (err) return reject(err);
      resolve(true);
    });
  });
};
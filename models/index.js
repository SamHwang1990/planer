/**
 * Created by sam on 17/1/2.
 */

const mongodClient = require('../connect_client/mongod');

exports.UserInfo = require('./user_info');
exports.UserPassword =require('./user_password');
exports.GroupInfo = require('./group_info');
exports.PlanBox = require('./plan_box');

mongodClient.connect();
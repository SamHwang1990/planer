/**
 * Created by sam on 17/1/5.
 */

const session = require('koa-generic-session');
const redis = require('koa-redis');

const redisStore = require('../../connect_client/redisStore').connect();

exports.createToken = function* createToken(next) {

};

exports.verifyToken = function* verifyToken(next) {

};

exports.lockTokenToBlacklist = function* lockTokenToBlacklist(next) {

};

exports.searchTokenInBlacklist = function* searchTokenInBlacklist(next) {

};

exports.cleanTokenFromBlacklist = function* cleanTokenFromBlacklist(next) {

};

exports.createSession = function* createSession(next) {

};

exports.verifySession = function* verifySession(next) {

};

exports.deleteSession = function* deleteSession(next) {

};

exports.updateSession = function* updateSession(next) {

};

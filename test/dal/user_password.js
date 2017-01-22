/**
 * Created by samhwang1990@gmail.com on 17/1/22.
 */

'use strict';

const Mongoose = require('mongoose');
const UserPasswordModel = require('../../models/user_password');
const UserPasswordDal = require('../../dal/user_password');

const PlanerError = require('../../modules/Error');

describe('UserPassword database access layer api testing', () => {
  var MongoConnection;

  before('create mongo connection', function* () {
    MongoConnection = require('../../connect_client/mongod').connect();
    yield MongoConnection;
  });

  after('destroy mongo connection', function* () {
    yield MongoConnection.disconnect();
  });

  describe('updatePassword()', () => {
    afterEach('empty planer collection', function* () {
      yield UserPasswordModel.remove({});
    });

    it('throw when email param is empty', function* () {
      try {
        yield UserPasswordDal.updatePassword({});
      } catch (e) {
        (e instanceof PlanerError.InvalidParameterError).should.be.true;
      }
    });

    it('throw when password param is empty', function* () {
      try {
        yield UserPasswordDal.updatePassword({});
      } catch (e) {
        (e instanceof PlanerError.InvalidParameterError).should.be.true;
      }
    });

    it('throw when user with specified email param is not existed', function* () {
      try {
        yield UserPasswordDal.updatePassword({email: 'notexisted@bar.com', password: '111'});
      } catch (e) {
        (e instanceof PlanerError.BasicError).should.be.true;
        PlanerError.BasicError.info(e).code.should.be.equal(PlanerError.CODE.FA_USER_NOT_FOUND);
      }
    });

    it('if user has no password info, create it with the specified password param', function* () {

    });

    it('throw when password repeated in one year', function* () {

    });

    it('save new password and clean timeout history', function* () {

    })
  });

  describe('checkPassword()', () => {
    afterEach('empty planer collection', function* () {
      yield UserPasswordModel.remove({});
    });

    it('throw when email param is empty', function* () {

    });

    it('throw when password param is empty', function* () {

    });

    it('throw when user with specified email param is not existed', function* () {

    });
  })
});
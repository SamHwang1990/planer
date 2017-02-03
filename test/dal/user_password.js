/**
 * Created by samhwang1990@gmail.com on 17/1/22.
 */

'use strict';

const UserPasswordModel = require('../../models/user_password');
const UserInfoModel = require('../../models/user_info');
const UserPasswordDal = require('../../dal/user_password');
const UserInfoDal = require('../../dal/user_info');

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

  beforeEach('empty user info and password collection', function* () {
    yield UserInfoModel.remove({});
    yield UserPasswordModel.remove({});
  });

  afterEach('empty user info and password collection', function* () {
    yield UserInfoModel.remove({});
    yield UserPasswordModel.remove({});
  });

  describe('updatePassword()', () => {
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
      var foo = {
        email: 'foo@bar.com',
        nickname: 'Turing',
        remark: 'hero'
      };

      yield UserInfoDal.create(foo);

      let fooPassword = yield UserPasswordModel.findOne({email: foo.email});
      (fooPassword == null).should.be.true;

      let updateResult = yield UserPasswordDal.updatePassword({email: foo.email, password: '123'});
      updateResult.action.should.be.equal('create');

      let newPassword = yield UserPasswordDal.crypto_pbkdf2_thunk('123', updateResult.userPassword.salt);
      newPassword.toString('hex').should.be.equal(updateResult.userPassword.password);
    });

    it('throw when password repeated in one year', function* () {
      var foo = {
        email: 'foo@bar.com',
        nickname: 'Turing',
        remark: 'hero'
      };

      yield UserInfoDal.create(foo);
      yield UserPasswordDal.updatePassword({email:foo.email, password: '123'});

      try {
        yield UserPasswordDal.updatePassword({email:foo.email, password: '123'});
      } catch(e) {
        PlanerError.BasicError.info(e).code.should.be.equal(PlanerError.CODE.FA_PASSWORD_REPEATED);
      }
    });

    it('save new password and clean timeout history', function* () {
      var foo = {
        email: 'foo@bar.com',
        nickname: 'Turing',
        remark: 'hero'
      };

      yield UserInfoDal.create(foo);
      yield UserPasswordDal.updatePassword({email:foo.email, password: '123'});

      let updateResult = yield UserPasswordDal.updatePassword({email: foo.email, password: '456'});
      updateResult.action.should.be.equal('update');

      let newPassword = yield UserPasswordDal.crypto_pbkdf2_thunk('456', updateResult.userPassword.salt);
      (newPassword.toString('hex')).should.be.equal(updateResult.userPassword.password);
    })
  });

  describe('checkPassword()', () => {
    it('throw when user_id param is empty', function* () {
      try {
        yield UserPasswordDal.checkPassword();
      } catch(e) {
        (e instanceof PlanerError.InvalidParameterError).should.be.true;
      }
    });

    it('throw when password param is empty', function* () {
      try {
        yield UserPasswordDal.checkPassword({user_id: 'not real id'});
      } catch(e) {
        (e instanceof PlanerError.InvalidParameterError).should.be.true;
      }
    });

    it('check is current password', function* () {
      var foo = {
        email: 'foo@bar.com',
        nickname: 'Turing',
        remark: 'hero'
      };

      yield UserInfoDal.create(foo);
      yield UserPasswordDal.updatePassword({email: foo.email, password: '123'});

      let foo_id = (yield UserInfoDal.query({email: foo.email})).id;

      (yield UserPasswordDal.checkPassword({user_id: foo_id, password: '123'})).should.be.true;
      (yield UserPasswordDal.checkPassword({user_id: foo_id, password: '345'})).should.be.false;

    });
  })
});
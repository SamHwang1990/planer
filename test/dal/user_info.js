/**
 * Created by samhwang1990@gmail.com on 17/1/19.
 */

'use strict';

const UserInfoModel = require('../../models/user_info');
const UserInfoDal = require('../../dal/user_info');

describe('UserInfo database access layer api testing', () => {
  var MongoConnection;

  before('create mongo connection', function* () {
    MongoConnection = require('../../connect_client/mongod').connect();
    yield MongoConnection;
  });

  after('destroy mongo connection', function* () {
    yield MongoConnection.disconnect();
  });

  describe('create()', () => {
    afterEach('empty planer collection', function* () {
      yield UserInfoModel.remove({});
    });

    it('only email field is required', function* () {
      var email = 'foo@bar.com';
      var newUser = yield UserInfoDal.create({
        email: email
      });

      newUser.email.should.be.equal(email);
    });

    it('email field has unique index', function* () {
      var email = 'foo@bar.com';

      yield UserInfoDal.create({ email });

      try {
        yield UserInfoDal.create({ email });
      } catch (e) {
        e.code.should.be.equal(11000);
      }
    });

    it('email field shall match regex validation', function* () {

    });

    it('new user is active default', function* () {
      var email = 'foo@bar.com';

      var newUser = yield UserInfoDal.create({ email });
      newUser.status.should.be.equal('active');

      newUser = yield UserInfoDal.create({ email: 'bar@foo.com', status: 'inactive'});
      newUser.status.should.be.equal('inactive');
    });
  });

  describe('query()', () => {
    afterEach('empty planer collection', function* () {
      yield UserInfoModel.remove({});
    });

    it('email field as key', function* () {
      yield UserInfoDal.create({email: 'foo@bar.com'});

      let queryResult;
      queryResult = yield UserInfoDal.query({email: 'unexisted@bar.com'});
      (queryResult == null).should.be.true;

      queryResult = yield UserInfoDal.query({email: 'foo@bar.com'});
      (queryResult != null).should.be.true;
      queryResult.email.should.be.equal('foo@bar.com');
    });

    it('email key is required', function* () {
      try {
        yield UserInfoDal.query({});
      } catch (e) {
        e.message.should.be.equal('query userinfo failed: parameter can not be empty.');
      }
    });
  });

  describe('update()', () => {
    afterEach('empty planer collection', function* () {
      yield UserInfoModel.remove({});
    });

    it('default', function* () {
      var foo = {
        email: 'foo@bar.com',
        nickname: 'Turing',
        remark: 'hero'
      };

      yield UserInfoDal.create(foo);

      let newFoo = yield UserInfoDal.update({nickname: 'sam', email: 'foo@bar.com'});
      newFoo.email.should.be.equal('foo@bar.com');
      newFoo.nickname.should.be.equal('Turing');
    });
  });
});
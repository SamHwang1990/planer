/**
 * Created by samhwang1990@gmail.com on 17/1/19.
 */

'use strict';

const Mongoose = require('mongoose');
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

    it('accept object param and the email field as condition', function* () {
      var foo = {
        email: 'foo@bar.com',
        nickname: 'Turing',
        remark: 'hero'
      };

      yield UserInfoDal.create(foo);

      let existedUser = yield UserInfoDal.update({email: foo.email});
      existedUser.nickname.should.be.equal(foo.nickname);

      let unexistedUser = yield UserInfoDal.update({email: 'unexisted@bar.com'});
      (unexistedUser == null).should.be.true;
    });

    it('email and group_id field will be ignored', function* () {
      var foo = {
        email: 'foo@bar.com',
        nickname: 'Turing',
        remark: 'hero'
      };

      yield UserInfoDal.create(foo);
      yield UserInfoDal.update({
        email: foo.email,
        nickname: 'sam',
        group_id: [new Mongoose.SchemaTypes.ObjectId()]
      });
      let current = yield UserInfoDal.query({email: foo.email});

      current.group_id.length.should.be.equal(0);
      current.nickname.should.be.equal('sam');
    });

    it('_id nor group_id field are excluded in return', function* () {
      var foo = {
        email: 'foo@bar.com',
        nickname: 'Turing',
        remark: 'hero'
      };

      yield UserInfoDal.create(foo);
      let oldInfo = yield UserInfoDal.update({
        email: foo.email,
        nickname: 'sam'
      });

      (oldInfo.group_id == null).should.be.true;
      (oldInfo.id == null).should.be.true;
      oldInfo.nickname.should.be.equal('Turing');
    });
  });
});
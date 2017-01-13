/**
 * Created by samhwang1990@gmail.com on 17/1/14.
 */

'use strict';

const mock = require('mock-require');
const process =require('process');
const path = require('path');

const SystemConfigModulePath = '../../../modules/SystemConfig/index';

function cleanSystemConfigCache() {
  delete require.cache[require.resolve(SystemConfigModulePath)];
}

describe('read config file from env or current dir', function() {
  before(cleanSystemConfigCache);

  afterEach(cleanSystemConfigCache);

  it('if env PLANER_HOME is defined, use it', function() {
    var confDir;
    var oldHome = process.env.PLANER_HOME;

    process.env.PLANER_HOME = '/tmp/';
    mock('fs', {
      readdirSync: dir => confDir = dir
    });

    try {
      require(SystemConfigModulePath).getBoolean('a');
    } catch (e) {
      path.resolve('/tmp/').should.be.equal(path.dirname(confDir));
    }

    if (oldHome == null) {
      delete process.env.PLANER_HOME;
    } else {
      process.env.PLANER_HOME = oldHome;
    }

    mock.stop('fs');
  });

  it('if env PLANER_HOME is undefined, use current dir', function() {
    var confDir;

    mock('fs', {
      readdirSync: dir => confDir = dir
    });

    try {
      require(SystemConfigModulePath).getBoolean('a');
    } catch (e) {
      path.resolve(__dirname, '../../').should.be.equal(path.dirname(confDir));
    }

    mock.stop('fs');
  });

  it('if config dir is not existed, throw ENOENT error', function() {
    var oldHome = process.env.PLANER_HOME;

    process.env.PLANER_HOME = path.resolve(__dirname, './unexisteddir');

    try {
      require(SystemConfigModulePath).getBoolean('a');
    } catch (e) {
      e.code.should.be.equal('ENOENT');
    }

    if (oldHome == null) {
      delete process.env.PLANER_HOME;
    } else {
      process.env.PLANER_HOME = oldHome;
    }
  });
});

describe('SystemConfig api test', function() {
  var oldHome;
  var SystemConfig;

  before('set PLANER_HOME and require module', () => {

    cleanSystemConfigCache();

    oldHome = process.env.PLANER_HOME;
    process.env.PLANER_HOME = path.resolve(__dirname);

    SystemConfig = require(SystemConfigModulePath);
  });

  after('reset PLANER_HOME and module', () => {
    if (oldHome == null) {
      delete process.env.PLANER_HOME;
    } else {
      process.env.PLANER_HOME = oldHome;
    }

    cleanSystemConfigCache();
  });

  describe('SystemConfig.getSection()', function() {
    it('section return empty object when request path not exist', () => {
      var unExistedSection = SystemConfig.getSection('unexisted/section');
      'object'.should.be.equal(typeof unExistedSection);
      Object.keys(unExistedSection).length.should.be.eql(0);
    })
    it('section return the whole object', () => {
      var levelSection = SystemConfig.getSection('foo/simpleSection/level');
      levelSection.should.be.eql({
        used: 'trace',
        'default': 'info',
        'options': ['trace', 'debug', 'info', 'warn', 'error', 'fatal'],
        'desc': '日志级别'
      });
    });
    it('section should contain sub section', () => {
      var simpleSection = SystemConfig.getSection('foo/simpleSection');
      simpleSection.hasOwnProperty('level').should.be.true;
    })
  });

  describe('SystemConfig.getBoolean()', function() {
    it('return boolean type', () => {
      'boolean'.should.be.eql(typeof SystemConfig.getBoolean('foo/booleanWithDefaultTrue'));
      'boolean'.should.be.eql(typeof SystemConfig.getBoolean('foo/stringWithDefault'));
      'boolean'.should.be.eql(typeof SystemConfig.getBoolean('foo/simpleSection'));
    });

    it('config value priority: used > customDefault > configDefault', () => {
      false.should.be.equal(SystemConfig.getBoolean('foo/booleanWithUsed'));
      true.should.be.equal(SystemConfig.getBoolean('foo/booleanWithDefaultTrue'));
      false.should.be.equal(SystemConfig.getBoolean('foo/booleanWithDefaultTrue', false));
    });

    it('false like string shall convert to false', () => {
      false.should.be.eql(SystemConfig.getBoolean('foo/booleanWithDefaultTrue', 'false'));
      false.should.be.eql(SystemConfig.getBoolean('foo/booleanWithDefaultTrue', '0'));
      false.should.be.eql(SystemConfig.getBoolean('foo/booleanWithDefaultTrue', 'undefined'));
      false.should.be.eql(SystemConfig.getBoolean('foo/booleanWithDefaultTrue', 'null'));
    });

    it('when section is not exist, return customDefault or false', () => {
      true.should.be.eql(SystemConfig.getBoolean('unexisted/section', true));
      false.should.be.eql(SystemConfig.getBoolean('unexisted/section', false));
      false.should.be.eql(SystemConfig.getBoolean('unexisted/section'));
    });
  });

  describe('SystemConfig.getString()', function() {
    it('return string type', () => {
      'string'.should.be.eql(typeof SystemConfig.getString('foo/booleanWithDefaultTrue'));
      'string'.should.be.eql(typeof SystemConfig.getString('foo/stringWithDefault'));
      'string'.should.be.eql(typeof SystemConfig.getString('foo/simpleSection'));
    });

    it('config value priority: used > customDefault > configDefault', () => {
      'bar'.should.be.equal(SystemConfig.getString('foo/stringWithUsed', 'planer'));
      'foo'.should.be.equal(SystemConfig.getString('foo/stringWithDefault'));
      'planer'.should.be.equal(SystemConfig.getString('foo/stringWithDefault', 'planer'));
    });

    it('when try to get section, return empty string', () => {
      (0).should.be.eql(SystemConfig.getString('foo/simpleSection').length);
    });

    it('when section is not exist, return customDefault or empty string', () => {
      'planer'.should.be.eql(SystemConfig.getString('unexisted/section', 'planer'));
      (0).should.be.eql(SystemConfig.getString('unexisted/section').length);
    });
  });

  describe('SystemConfig.getInt()', function() {
    it('return string type', () => {
      'number'.should.be.eql(typeof SystemConfig.getInt('foo/booleanWithDefaultTrue'));
      'number'.should.be.eql(typeof SystemConfig.getInt('foo/stringWithDefault'));
      'number'.should.be.eql(typeof SystemConfig.getInt('foo/simpleSection'));
    });

    it('config value priority: used > customDefault > configDefault', () => {
      (3).should.be.equal(SystemConfig.getInt('foo/intWithUsed', 6));
      (2).should.be.equal(SystemConfig.getInt('foo/intWithDefault'));
      (6).should.be.equal(SystemConfig.getInt('foo/intWithDefault', 6));
    });

    it('when try to get section or not integer like config, return NaN', () => {
      isNaN(SystemConfig.getInt('foo/simpleSection')).should.be.true;
      isNaN(SystemConfig.getInt('foo/stringWithUsed')).should.be.true;

      // todo: all config value in yaml are treated as string first
      isNaN(SystemConfig.getInt('foo/booleanWithUsed')).should.be.true;
    });

    it('when section is not exist, return customDefault or NaN', () => {
      (1).should.be.eql(SystemConfig.getInt('unexisted/section', 1));
      isNaN(SystemConfig.getInt('unexisted/section')).should.be.true;
    });
  });
});
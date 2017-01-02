/**
 * Created by sam on 17/1/1.
 */

const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

const cacheable = require('../../utils/cacheable');

const config = {};

function loadConfig() {
  var dirFiles;
  try {
    dirFiles = fs.readdir(path.resolve('../../conf/'));
  } catch (e) {
    // todo: throw error with specific type
  }

  try {
    for(let [index, fileName] of dirFiles.values()) {
      let filePath = path.resolve(`../../conf/${fileName}`);
      let fileStat = fs.statSync(filePath);

      if (!fileStat.isFile()) continue;

      Object.defineProperty(config, fileName.replace('.yaml', ''), {
        configurable: false,
        enumerable: true,
        writable: false,
        value: yaml.safeLoad(fs.readFileSync(filePath, 'utf-8'))
      });
    }
  } catch (e) {
    // todo: 上面有多次同步IO 操作,包括读取yaml,可能需要细化错误捕抓
  }
}

var getItemBase = cacheable(function getItemBaseProto(path) {
  if (!path) return {};

  path = path.split('/');

  if (!Object.keys(config).length) loadConfig();

  let meta = path.reduce((result, current) => {
    if (result == null || !Object.keys(result)) return {};
    return result[current];
  }, config);

  return meta;
});

function _convertToBoolean(v) {
  return !!v && v !== 'false' && v !== 'undefined' && v !== 'null' && v !== '0';
}

exports.getBoolean = function getBoolean(path, defaultV) {
  var { used, 'default': configDefault } = getItemBase(path);

  // 可能使用js-yaml 的schema 之后可以免去convert 的逻辑
  return _convertToBoolean(used || defaultV || configDefault);
};

exports.getString = function getString(path, defaultV) {
  var { used, 'default': configDefault } = getItemBase(path);
  return used || defaultV || configDefault || '';
};

exports.getInt = function getInt(path, defaultV) {
  var { used, 'default': configDefault } = getItemBase(path);
  return parseInt(used || defaultV || configDefault);
};

exports.getSection = function getSection(path) {
  return getItemBase(path);
};


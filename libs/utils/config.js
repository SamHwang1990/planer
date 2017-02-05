/**
 * Created by sam on 17/1/1.
 */

'use strict';

const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const ms = require('ms');

const cacheable = require('./cacheable');

const config = {};
const planerHome = process.env.PLANER_HOME || path.resolve(__dirname, '../');

function loadConfig() {
  var confDir = path.join(planerHome, './conf');
  var dirFiles;

  try {
    dirFiles = fs.readdirSync(confDir);
  } catch (e) {
    throw e;
  }

  try {
    for(let [index, fileName] of dirFiles.entries()) {
      let filePath = path.resolve(confDir, fileName);
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

var getSectionBase = cacheable(function getSectionBaseProto(path) {
  if (!path) return {};

  path = path.split('/');

  if (!Object.keys(config).length) loadConfig();

  return path.reduce((result, current) => {
    if (result == null || !result.hasOwnProperty(current)) return {};
    return result[current];
  }, config);
});

function _convertToBoolean(v) {
  return !!v && v !== 'false' && v !== 'undefined' && v !== 'null' && v !== '0';
}

function compareConfigPriority(configSection, customDefault) {
  var confValue;

  if (configSection.hasOwnProperty('used')) {
    confValue = configSection.used;
  } else if (customDefault != null) {
    confValue = customDefault;
  } else if (configSection.hasOwnProperty('default')) {
    confValue = configSection.default;
  }

  return confValue;
}

function getBoolean(path, defaultV) {
  var section = getSectionBase(path);

  // 可能使用js-yaml 的schema 之后可以免去convert 的逻辑
  return _convertToBoolean(compareConfigPriority(section, defaultV));
}

function getString(path, defaultV) {
  var section = getSectionBase(path);
  var confV = compareConfigPriority(section, defaultV);

  // assume there is no function value
  if (typeof confV === 'object') {
    confV = JSON.stringify(confV);
  } else if (confV == null) {
    confV = '';
  } else if (typeof confV !== 'string') {
    confV = confV + '';
  }

  return confV || '';
}

function getInt(path, defaultV) {
  var section = getSectionBase(path);
  var confV = compareConfigPriority(section, defaultV);
  return parseInt(confV, 10);
}

function getMilliseconds(path, defaultV) {
  var value = getString(path, defaultV);
  return ms(value);
}

function getSeconds(path, defaultV) {
  return getMilliseconds(path, defaultV) / 1000;
}

function getSection(path) {
  return getSectionBase(path);
}

module.exports = {
  getBoolean,
  getString,
  getInt,
  getMilliseconds,
  getSeconds,
  getSection
};


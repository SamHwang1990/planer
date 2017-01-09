/**
 * Created by sam on 17/1/9.
 */

'use strict';

let exportUtil = require('./export');
let apiExec = require('./exec');

exports.exportResult = exportUtil.export;
exports.exportCode = exportUtil.CODE;
exports.exec = apiExec;
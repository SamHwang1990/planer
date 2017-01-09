/**
 * Created by sam on 17/1/9.
 */

'use strict';

let CODE = exports.CODE = {
  'S_OK'      : 'S_OK',
  'PARTIAL_OK': 'PARTIAL_OK',
  'FAIL'      : 'FA_UNKNOWN'
};

exports.export = function* exportResult(code = CODE.S_OK, result = {}, message = '') {
  yield {
    code,
    meta: result,
    message: message
  }
};
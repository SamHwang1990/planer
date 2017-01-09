/**
 * Created by sam on 17/1/8.
 */

'use strict';

const SessionStore = require('../Session');
const APIBase = require('../API');

module.exports = function* logout() {
  yield SessionStore.destroy();
  yield APIBase.exportResult(APIBase.exportCode.S_OK);
};
/**
 * Created by sam on 17/1/8.
 */

'use strict';

const BasicError = require('./BasicError');

module.exports = class AuthorizationError extends BasicError {
  constructor(message) {
    super('FA_UNAUTHORIZED', message);
  }
};
/**
 * Created by sam on 17/1/4.
 */

const VError = require('verror');

exports.CODE = {
  'FA_USER_NOT_FOUND': 'FA_USER_NOT_FOUND',

  'FA_PASSWORD_EMPTY': 'FA_PASSWORD_EMPTY',

  'FA_INVALID_PARAMETER': 'FA_INVALID_PARAMETER',

  'FA_PASSWORD_REPEATED': 'FA_PASSWORD_REPEATED',

  'FA_EMPTY_LOGIN_SESSION': 'FA_EMPTY_LOGIN_SESSION',
  'FA_INVALID_LOGIN_SESSION': 'FA_INVALID_LOGIN_SESSION',

  'FA_TOKEN_NOT_FOUND': 'FA_TOKEN_NOT_FOUND',
  'FA_TOKEN_EXPIRED': 'FA_TOKEN_EXPIRED',
  'FA_INVALID_TOKEN': 'FA_INVALID_TOKEN',

  'FA_INVALID_SESSION': 'FA_INVALID_SESSION'
};

exports.BasicError = VError;
exports.InvalidParameterError = class InvalidParameterError extends VError{
  constructor(...args) {
    super(...args);
    this.name = 'InvalidParameterError';
  }
};
exports.AuthorizationError = class UnauthorizedError extends VError{
  constructor(...args) {
    super(...args);
    this.name = 'UnauthorizedError';
  }
};
exports.ProcessExitError = class ProcessExitError extends VError{
  constructor(...args) {
    super(...args);
    this.name = 'ProcessExitError';
  }
};
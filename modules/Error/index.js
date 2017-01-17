/**
 * Created by sam on 17/1/4.
 */

const VError = require('verror');

exports.BasicError = VError;
exports.InvalidParameterError = class InvalidParameterError extends VError{
  constructor() {
    super();
    this.name = 'InvalidParameterError';
  }
};
exports.AuthorizationError = class UnauthorizedError extends VError{
  constructor() {
    super();
    this.name = 'UnauthorizedError';
  }
};
exports.ProcessExitError = class ProcessExitError extends VError{
  constructor() {
    super();
    this.name = 'ProcessExitError';
  }
};
/**
 * Created by sam on 17/1/4.
 */

const VError = require('verror');

exports.BasicError = VError;
exports.InvalidParameterError = class InvalidParameterError extends VError{};
exports.AuthorizationError = class UnauthorizedError extends VError{};
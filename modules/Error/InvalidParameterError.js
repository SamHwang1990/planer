/**
 * Created by sam on 17/1/5.
 */

const BasicError = require('./BasicError');

module.exports = class InvalidParameterError extends BasicError {
  constructor(message) {
    super('FA_INVALID_PARAMETER', message);
  }
};
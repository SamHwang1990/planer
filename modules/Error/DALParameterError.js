/**
 * Created by sam on 17/1/5.
 */

const BasicError = require('./BasicError');

module.exports = class DALParameterError extends BasicError {
  constructor(message) {
    super('FA_INVALID_PARAMETER', message);
  }
};
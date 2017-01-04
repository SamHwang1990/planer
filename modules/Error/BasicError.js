/**
 * Created by sam on 17/1/4.
 */

module.exports = class BasicError extends Error{
  constructor(code, message) {
    super();
    Error.captureStackTrace(this, this.constructor);
    this.code = code;
    this.message = message;
    this.name = this.constructor.name;
  }
  toString() {
    return `${this.name}: ${this.code}, ${this.message}`;
  }
};
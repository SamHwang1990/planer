/**
 * Created by sam on 17/1/4.
 */

module.exports = class BasicError extends Error{
  constructor(code, message) {
    super();

    // 第二个参数的意义在于: 错误的堆栈中排除当前函数调用
    Error.captureStackTrace(this, this.constructor);
    this.code = code;
    this.message = message;
    this.name = this.constructor.name;
  }
  toString() {
    return `${this.name}: ${this.code}, ${this.message}`;
  }
};
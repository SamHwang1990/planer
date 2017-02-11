/**
 * Created by samhwawng1990@gmail.com on 2017/2/10.
 */

'use strict';

const PlanerContext = require('../ContextFactory');
const PlanerError = require('../../utils/error');

const APIExecCode = {
  S_OK: 'S_OK'
};

const PlanerContextProtoMethodWeakMap = {};
const PlanerContextOwnFieldWeakMap = {};

// APIContext 隐式继承自PlanerContext，详见getInstance 静态方法
class APIContext {
  constructor(path) {
    this.execResult = {
      code: 'S_OK',
      meta: {},
      msg: ''
    };

    Object.defineProperty(this, 'execCode', {
      configurable: false,
      writable: false,
      enumerable: false,
      value: APIExecCode
    });

    this.path = path;
  }

  setResultCode(code = APIExecCode.S_OK) {
    this.execResult.code = code;
  }

  setResultMsg(msg) {
    this.execResult.msg = msg;
  }

  setResultMeta(field, value) {
    if (typeof field === 'string') {
      this.execResult.meta[field] = value;
    } else {
      this.execResult.meta = field;
    }
  }

  exportResult() {
    let result = {
      code: this.execResult.code,
      meta: this.execResult.meta
    };

    let msg = this.execResult.msg;
    if (msg.length) {
      result.msg = msg
    }

    return result;
  }

  *execAPI() {
    let funcModule = this.apiModuleExplorer.get(this.path);

    if (funcModule == null) {
      this.setResultCode('FA_INVALID_METHOD');
      this.setResultMsg(`request method ${this.path} is not registered`);
      this.setResultMeta('method', this.path);
      return this.exportResult();
    }

    try {
      yield funcModule(this);
    } catch (e) {
      // common error catch handlers
    }

    return this.exportResult();
  }

  static getInstance(path, planerContext) {
    if (!(planerContext instanceof PlanerContext)) {
      throw new PlanerError.InvalidParameterError('failed to new api context: wrong planer context type');
    }

    let apiContext = new APIContext(path);

    Object.keys(planerContext).forEach(key => {

      if (PlanerContextOwnFieldWeakMap[key] == null) {
        PlanerContextOwnFieldWeakMap[key] = new WeakMap;
      }

      PlanerContextOwnFieldWeakMap[key].set(apiContext, planerContext[key]);

      Object.defineProperty(apiContext, key, {
        configurable: false,
        writable: false,
        enumerable: false,
        get: () => {
          return PlanerContextOwnFieldWeakMap[key].get(apiContext);
        }
      });
    });

    Object.keys(Object.getPrototypeOf(planerContext)).forEach(key => {
      if (typeof planerContext[key] !== 'function') return;

      if (PlanerContextProtoMethodWeakMap[key] == null) {
        PlanerContextProtoMethodWeakMap[key] = new WeakMap;
      }

      PlanerContextOwnFieldWeakMap[key].set(apiContext, planerContext[key].bind(planerContext));

      Object.defineProperty(apiContext, key, {
        configurable: false,
        writable: false,
        enumerable: false,
        get: () => {
          return PlanerContextProtoMethodWeakMap[key].get(apiContext);
        }
      });
    });

    return apiContext;
  }
}

module.exports = {
  getInstance: APIContext.getInstance
};
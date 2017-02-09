/**
 * Created by samhwawng1990@gmail.com on 2017/2/8.
 */

'use strict';

class DocumentUpdateExecutor {
  constructor(document, pathFilter) {
    this._document = document;
    this._pathSet = [];
    this._pathFilter = pathFilter;
  }

  // 参数意义参见mongoose/document.js/set
  set(path, value, type, options) {
    if (Object.prototype.toString.call(this._pathFilter) === '[object Function]') {
      if (!this._pathFilter(path)) return false;
    }

    this._pathSet.push([path, value, type, options]);
  }

  reset() {
    this._pathSet.length = 0;
  }

  abort() {
    this.reset();
    this._document = null;
  }

  *exec () {
    if (this._pathSet.length <=0 ) return;
    for (let path of this._pathSet) {
      this._document.set(...path);
    }
    yield this._document.save();
  }

  *once() {
    yield this.exec();
    this.abort();
  }

  static *newExecutor(document) {
    return new DocumentUpdateExecutor(document);
  }
}

module.exports = DocumentUpdateExecutor;
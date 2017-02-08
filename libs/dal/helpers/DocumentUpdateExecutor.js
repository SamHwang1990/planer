/**
 * Created by samhwawng1990@gmail.com on 2017/2/8.
 */

'use strict';

class DocumentUpdateExecutor {
  constructor(document) {
    this._document = document;
    this._pathSet = [];
  }

  // 参数意义参见mongoose/document.js/set
  set(path, value, type, options) {
    if (['email', '_id'].indexOf(path) >= 0) return;

    this._pathSet.push([path, value, type, options]);
  }

  unset() {
    this._pathSet.length = 0;
  }

  abort() {
    this.unset();
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
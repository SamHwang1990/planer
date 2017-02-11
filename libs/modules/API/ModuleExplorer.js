/**
 * Created by samhwawng1990@gmail.com on 2017/2/10.
 */

'use strict';

class APIModuleExplorer {
  constructor() {
    this._modules = new WeakMap();
  }

  upsert(path, module) {
    if (typeof path === 'string') {
      if (module) {
        this._modules.set(path, module);
      } else {
        this._modules.delete(path);
      }
      return;
    }

    if (path instanceof WeakMap) {
      this._modules = path;
      return;
    }
    
    if (Object.prototype.toString.call(path) === '[object Object]') {
      for (let modulePath of Object.keys(path)) {
        this.upsert(modulePath, path[modulePath]);
      }
    }
  }

  remove(path) {
    this.upsert(path);
  }

  get(path) {
    return this._modules.get(path);
  }
}

module.exports = APIModuleExplorer;
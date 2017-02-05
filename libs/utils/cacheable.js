/**
 * Created by sam on 17/1/2.
 */

/**
 * 缓存同步函数的执行
 * */
function cacheable(fn) {
  const cache = Object.create(null);
  return function cacheFn(str) {
    const hit = cache[str];
    return hit || (cache[str] = fn(str));
  }
}

module.exports = cacheable;
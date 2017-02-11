/**
 * Created by samhwang1990@gmail.com on 17/2/10.
 */

'use strict';

// todo: WeakMap 可能会导致api 方法被回收了, 有兴趣体验下
const moduleMap = new WeakMap(
    // ['user:logout', require('./UserLogin').logout]
);

module.exports = moduleMap;
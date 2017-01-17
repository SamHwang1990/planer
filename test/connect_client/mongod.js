/**
 * Created by samhwang1990@gmail.com on 17/1/16.
 */

'use strict';

describe('connect', function() {
  it('shall connect successfully by default config', function(done) {
    var MongodClient = require('../../connect_client/mongod');
    MongodClient.connect().then(() => {
      done();
    }, (err) => {
      done(err);
    });
  });
});
/**
 * Created by samhwang1990@gmail.com on 17/1/16.
 */

'use strict';

describe('connect', function() {
  var connection;

  after(() => {
    connection && connection.disconnect();
  });

  it('shall connect successfully by default config', function(done) {
    var MongodClient = require('../../connect_client/mongod');

    connection = MongodClient.connect();
    connection.then(() => {
      done();
    }, (err) => {
      done(err);
    });
  });
});
/**
 * Created by samhwang1990@gmail.com on 17/2/10.
 */

'use strict';

const Koa = require('koa');

const PlanerConfig = require('../../libs/utils/config');
const ApplicationFactory = require('../../libs/modules/ApplicationFactory');
const PlanerContextFactory = require('../../libs/modules/ContextFactory');

const app = new Koa;

const planerApp = ApplicationFactory.getInstance(app);
planerApp.getAPIModuleExplorer().upsert(require('./apiModuleMap'));

app.use(function*(next) {
  PlanerContextFactory.getInstance(this);
  yield next;
});


const port = PlanerConfig.getInt('services/User/port', 80);
const sslPort = PlanerConfig.getInt('services/User/sslPort');
const enforceSSL = PlanerConfig.getBoolean('services/User/sslPort');

if (!Object.is(sslPort, NaN)) {
  app.listen(sslPort, () => {
    console.log(`listen on ${sslPort}`);
  });
}

if (!enforceSSL || Object.is(sslPort, NaN)) {
  app.listen(port, () => {
    console.log(`listen on ${port}`);
  });
}


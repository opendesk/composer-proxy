const {Route, Fragment, Url} = require('synthetis').DSL;
const config = require('../../config');

const baseTemplate = Fragment.base({
  url: Url.remote(config.defaultBackendUrl, '/fragment/base')
});

const greeter = Fragment.html({
  url: Url.remote(config.defaultBackendUrl, '/fragment/html')
});

const dataModel = Fragment.json({
  url: Url.remote(config.defaultBackendUrl, '/api/data'),
  query: {
    limit: 5
  }
});

module.exports = Route.route({
  path: '/item/:id',
  cacheMaxAge: 60 * 30,
  baseTemplate,
  fragments: {
    greeter,
    dataModel
  }
});

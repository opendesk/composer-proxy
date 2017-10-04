/**
 * All routes that the proxy can generate pages for are mounted as Koa router
 * routes here. The routes/ directory is parsed recusively and each module loaded.
 * The routes modules should expose a configured instance of the Route class.
 *
 * @licence `The Unlicense`, see LICENSE file included in this distribution.
 */
'use strict';

const Router = require('koa-router');
const FragmentFetchError = require('./errors').FragmentFetchError;

const fetcher = require('./fetcher');

// If specified we set a max age, else no-cache
function _cacheHeader(maxAge) {
  return maxAge ?
    `public; max-age=${maxAge}` :
    'no-cache, no-store, must-revalidate, max-age=0';
}

/**
 * Factory method to create initialise all the routes for the Koa router.
 * The Route instances are passed in and wrapped to create Koa router style routes
 *
 * @param routes {array} Array of Koa router routes in order to be mounted.
 * @param config {object} Application configuration
 * @returns {router} A Koa router configured with given routes.
 */
module.exports = function (renderer, routes, config, logger) {
  const router = new Router();

  /*
   * For each mounted route a route handler is created which calls
   * the `render` method of the Route instance. It can respond with HTML, a
   * URL to redirect to or nothing if the Route render method has created the
   * response itself.
   *
   * Note by default we assume we dont want to cache the response, hence the
   * Route should configure the correct caching behaviour otherwise.
   */
  function _routeHandler(route) {
    // By default resources are not cached, this should be set in Route
    return async function (ctx, next) {
      const log = ctx.state.logger || logger;
      function _setHeaders() {
        ctx.set('Cache-Control', _cacheHeader(route.maxAge));
        const headers = config.commonResponseHeaders ?
          Object.assign({}, config.commonResponseHeaders, route.responseHeaders) :
          route.responseHeaders;
        if (headers) {
          Object.keys(headers).forEach(k => ctx.set(k, headers[k]));
        }
      }

      // If a redirect, server and end middleware processing chain
      if (route.redirect) {
        log.info('Redirecting', route.redirect);
        _setHeaders();
        return ctx.redirect(route.redirect);
      }

      // The default routing request context object contains the request, response
      // and the request specific logger. Call the route r
      const context = Object.assign({logger: log}, ctx);
      let response;
      try {
        const continueProcessing = await route.onRequest(context);
        response = continueProcessing ? await renderer(route, fetcher, context) : false;
      } catch(err) {
        // If a required fragment could not be fetched proxy on
        if (err instanceof FragmentFetchError) {
          response = false;
        } else {
          throw err;
        }
      }

      // Continue to proxy middleware
      if (response === false) {
        return await next();
      }

      // Server response and end middleware processing chain
      log.info(`Responding with ${response.contentType} of length ${response.body.length}`);
      ctx.set('Content-Type', response.contentType || 'text/html; charset=utf-8');
      _setHeaders();
      ctx.body = response.body;
    };
  }

  // Set up all the routes in the order specified
  routes.forEach((route) => {
    (router[route.method])(route.path, _routeHandler(route, logger));
  });

  return router;
};

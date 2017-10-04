/**
 * Create the HTTP server
 */
'use strict';

const Koa = require('koa');
const koaViews = require('koa-views');
const HttpProxy = require('http-proxy');
const renderer = require('synthetis').render;

const router = require('./router');

// The Koa middleware to handle requests
const proxyMiddleware = (proxy, basePath, options, logger) => (ctx, next) => {
  if (!ctx.req.url.startsWith(basePath)) return next();

  const { logs, rewrite } = options;

  return new Promise((resolve) => {
    if (logs) {
      logger.info('Proxy: %s - %s %s', new Date().toISOString(), ctx.req.method, ctx.req.url);
    }

    if (typeof rewrite === 'function') {
      ctx.req.url = rewrite(ctx.req.url);
    }

    proxy.web(ctx.req, ctx.res, options, e => {
      const status = {
        ECONNREFUSED: 503,
        ETIMEOUT: 504
      }[e.code];
      if (status) ctx.status = status;
      resolve()
    })
  })
};

/**
 * Creates a new server instance with middleware etc configured
 * @param routesToMount {Array<module:routes~Route>} Array of Routes to mount
 * @param config {object} the application configuration
 */
module.exports = function (routesToMount, config) {
  // Requests which are not handled by the composer proxy are simply passed through
  const proxy = HttpProxy.createProxyServer();
  // Add cache control header to proxied requests
  proxy.on('proxyRes', function (proxyRes, req, res) {
    if (!proxyRes.headers['cache-control']) {
      res.setHeader('cache-control', 'must-revalidate, max-age=600');
    }
  });

  const logger = config.logger || console;
  const port = config.port || 3000;
  const app = new Koa();

  app.use(koaViews(
    config.viewPath || process.cwd() + '/views', {map: {html: 'dot'}})
  );

  // mount Route modules and otherwise simply proxy
  const koaRouter = router(renderer, routesToMount, config, logger);
  app.use(koaRouter.routes());
  app.use(koaRouter.allowedMethods());

  // Proxy everything else to default backend
  // Fastly rewrites the Host header to the proxy host so Heroku will route
  // correctly, however http-proxy with autoRewrite assumes you want to go to
  // whatever the source request Host is, which of course is now the proxy not
  // actual domain of forward layer
  const proxyOptions = {
    target: config.defaultBackendUrl,
    changeOrigin: true,
    logs: true
  };
  if (config.environment !== 'development') {
    proxyOptions.hostRewrite = config.proxyRewriteHostname;
  }
  app.use(proxyMiddleware(proxy, '/', proxyOptions, logger));

  // Create HTTP server + bind to port
  const server = app.listen(port);
  return {
    server,
    proxy,
    app
  };
};

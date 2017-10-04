#!/usr/bin/env node
/**
 * The main entry point for the proxy application. Set up the server and
 * default logger.
 */

const config = require('./config');

//const createServer = require('composer-proxy').createServer;
//const routesLoader = require('composer-proxy').routesLoader;
const createServer = require('../lib/server');
const routesLoader = require('../lib/loader');

const logger = config.logger;

const routes = routesLoader(process.cwd(), require('./routes/modules'), logger);
const composer = createServer(routes, config);

composer.app.use(async (ctx, next) => {
  try {
    await next();
  }
  catch (err) {
    // render the error page
    logger.error(`An unhandled error has occurred for request '${ctx.url}'`, err.message, err.stack);
    ctx.status = 500;
    await ctx.render('error', {err});
  }
});

composer.server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }
  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logger.error(port + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(port + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
});

composer.server.on('listening', function () {
  const addr = composer.server.address();
  const bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  logger.info(`Listening on ${bind}`);
});

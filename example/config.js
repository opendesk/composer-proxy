require('dotenv').config();

const logger = require('pino')();

module.exports = {
  logger,
  level: process.env['LOG_LEVEL'] || 'debug',
  port: process.env['PORT'] || 3000,
  environment: process.env['ENVIRONMENT'] || 'development',
  defaultBackendUrl: process.env['DEFAULT_BACKEND_URL'],
  defaultBackendMaxAge: process.env['DEFAULT_BACKEND_MAXAGE'] || 3600,
  commonResponseHeaders: {
    'X-Proxy-By': `${process.env['ENVIRONMENT']}-composer`,
  }
};
/**
 * Load Route defintion modules and `require` them. Specify the modules to load
 * as an array of paths relative to the `moduleBasePath` parameter.
 *
 * You can also specify the module path with an asterisk at the end to instruct
 * the application to recursively load all `.js` files below the given path,
 * e.g. `my/path/*` loads `my/path/**.js`
 *
 * @licence `The Unlicense`, see LICENSE file included in this distribution.
 */
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Load all modules in order specified and recurse directory tree as required.
 *
 * @param modulesBasePath {string} the base path of the modules to load
 * @param routesToLoad {array<string>} the module paths to load relative to `moduleBasePath`
 * @returns {array<Route>} array of loaded module export values (should be Route instances)
 */
module.exports = function (modulesBasePath, routesToLoad, logger) {
  const jsFiles = /\.js$/i;

  function _flatten(arr) {
    return arr.reduce((acc, val) => acc.concat(val), []);
  }

  function _loadModuleAndPrepare(p) {
    return require(p)(logger);
  }

  function _loadRoutes(base) {
    // Recursively parse the routes directory and require the modules
    function _parseDirectory (start) {
      const dirs = fs.readdirSync(start);
      return _flatten(dirs.map((fileName) => {
        const filePath = path.join(start, fileName);
        if (fs.statSync(filePath).isDirectory()) {
          return _parseDirectory(filePath);
        }
        return filePath;
      }));
    }

    return _parseDirectory(base).filter(f => jsFiles.test(f))
      .map(f => {
        logger.info(`Mount ${f} (from '*' include) as Route`);
        return _loadModuleAndPrepare(f);
      });
  }

  // Create all the routes in the order specified inside the routes module,
  // and recursively parse modules in directory as specified
  return _flatten(routesToLoad.map((modulePath) => {
    const absolutePath = path.join(modulesBasePath, modulePath);
    if (modulePath[modulePath.length - 1] === '*') {
      return _loadRoutes(absolutePath.slice(0, -1));
    } else {
      logger.info(`Mount ${absolutePath} as Route`);
      return _loadModuleAndPrepare(absolutePath);
    }
  }));
};
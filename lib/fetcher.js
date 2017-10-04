/**
 * Contains the logic around fetching Fragments. This includes http request fragments
 * local file fragments, and fragments with embedded data. Also encapsulates
 * the behaviour around error handling.
 *
 * @licence `The Unlicense`, see LICENSE file included in this distribution.
 */
'use strict';

const merge = require('lodash.merge');
const Promise = require('bluebird');
const readFile = Promise.promisify(require('fs').readFile);
const httpRequest = require('request-promise');
const url = require('url');
const FragmentBody = require('synthetis').FragmentBody;

const { FragmentFetchError } = require('./errors');

/**
 * Encapsulates the behaviour around fetching fragments.
 *
 * Fetches the fragment. The resulting promise will contain the fragment body
 * and content type. Errors on fetching are handled internally by calling the
 * fragment contentMissingMessage method. However this can be disabled using
 * the optional parameters
 *
 * @param {Fragment} fragment
 * @param {object} context the rendering context
 * @param {object} options options, optional
 * @param {string} options.uri the URI to request
 * @param {string} [options.method] the HTTP method , e.g. 'GET'
 * @param {object} [options.query] map of key/values for generated the query params on the requets
 * @param {object} [options.headers] map of headers and values
 * @param {number} [options.timeout] timeout in milliseconds, defaults to 3000
 * @param {string} [options.encoding] defaults to UTF-8
 * @param {string} [options.bodyType] The type of the body, 'json' for JSON bodies
 * @param {string} [options.fullResponse] Return full response object, not just body
 * @params {boolean} [options.neverHandleError] if true errors will not be handled internally
 * @returns {Promise.<{body, contentType}>} the promise will contain an object with 2 properties, `body` and `contentType`
 */

//fetch(fragment: Fragment, context: Context, options: {...}): Promise<FragmentBody>`
module.exports = async function fetcher(fragment, context, options = {}) {
  const _handleResponse = (r) => {
    if (options.neverHandleError) {
      return r;
    }
    return fragment.contentMissingMessage(r);
  };
  const response = await fetch(fragment, context, options);
  if (response instanceof Error) {
    return _handleResponse(response);
  }
  let body = response.body;
  if (body instanceof Error) {
    return _handleResponse(body);
  }

  return new FragmentBody(body, response.headers['content-type']);
};

/**
 * The default behaviour is to issue a get request for remote paths and pass
 * on all query params, else load local file.
 * Results are memoized.
 */
function fetch(fragment, context, options) {
  let fetchPromise;
  if (fragment.isLocalData && fragment.localData) {
    const data = fragment.localData;
    const resolvedData = typeof data === 'function' ? data(context) : data;
    fetchPromise = Promise.resolve({
      body: resolvedData,
      headers: {
        'content-type': 'application/json; charset=utf-8'
      }
    });
  } else {
    fetchPromise = fragment.isFile ?
      readFile(fragment.url.resolve(context)).then(f => {
        return {body: f.toString(), headers: {'content-type': 'text/html; charset=utf-8'}};
      }) :
      request(fragment, context, options);
  }

  return fetchPromise.then((response) => {
    return parseResponseBody(fragment, response.body, context).then((body) => {
      response.body = body;
      return response;
    });
  }).catch(error => {
    return onFragmentFetchError(error, fragment, context);
  });
}

function onFragmentFetchError(error, fragment, context) {
  const fetchError = new FragmentFetchError(error);
  if (fragment.onFetchError) {
    fragment.onFetchError(fetchError, context);
  } else if (fragment.isRequired) {
    throw fetchError;
  }
  return fetchError;
}

async function parseResponseBody(fragment, body, context) {
  const parser = fragment.parseResponseBody;
  return parser ? await parser(body, context) : body;
}

// Note if bodyType is json then body must be an object that can be serialised
function requestBody(fragment, context) {
  const body = fragment.body;
  if (!body) return;
  return (typeof body === 'function') ? body(context) : body;
}

function request(fragment, context, extraOptions) {
  const resolvedURL = fragment.url.resolve(context);
  const requestOptions = {
    gzip: true,
    uri: resolvedURL,
    method: fragment.method || 'get',
    qs: resolveParams(fragment, fragment.query, 'query', context),
    headers: injectHostHeader(
      resolvedURL,
      resolveParams(fragment, fragment.headers, 'headers', context)
    ),
    timeout: 3000,
    encoding: 'utf8',
    json: fragment.bodyType === 'json',
    resolveWithFullResponse: true
  };

  const body = requestBody(fragment, context);
  if (body) {
    requestOptions.body = body;
  }

  const auth = fragment.url && fragment.url.authorization;
  if (auth) {
    requestOptions.headers['Authorization'] = auth;
  }

  context.logger && context.logger.info(`Making request for ${requestOptions.uri}`, requestOptions);

  return httpRequest(merge(requestOptions, extraOptions));
}

function resolveParams(fragment, option, key, context) {
  const localSetting = typeof option === 'function' ? option(context) : option;
  const cloneSettings = Object.assign({}, localSetting);
  for (const p in cloneSettings) {
    if (cloneSettings.hasOwnProperty(p) && typeof cloneSettings[p] === 'function') {
      cloneSettings[p] = cloneSettings[p](context);
    }
  }
  return merge({}, cloneSettings, fragment.passQueryParams ? context.request[key] : {});
}


function injectHostHeader(fragmentURI, opts) {
  const parsedUri = url.parse(fragmentURI);
  const headers = {};
  const hasHostHeader = opts.headers && opts.headers['Host'];
  if (parsedUri.protocol === 'https:' && !hasHostHeader) {
    headers['Host'] = parsedUri.host;
  }
  return Object.assign(headers, opts.headers);
}
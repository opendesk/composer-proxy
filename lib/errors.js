/**
 * Error type classes
 *
 * @licence `The Unlicense`, see LICENSE file included in this distribution.
 */
'use strict';

const BaseError = require('synthetis').Errors.BaseError;

/**
 * Error type class for when fragments fail to fetch.
 */
class FragmentFetchError extends BaseError {}

module.exports = {
  FragmentFetchError
};

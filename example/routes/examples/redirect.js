const {Route} = require('synthetis').DSL;

module.exports = Route.route({
  path: '/examples/redirect',
  redirect: 'https://www.opendesk.cc'
});

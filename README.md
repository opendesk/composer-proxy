Description
===========

A library for building reverse proxies which combine content from HTML fragments and API responses.

Useful for either composing 3rd party or legacy services or combining mutliple inputs
to generate a single cacheable resource.

Documentation
-------------

To generate the JSDoc documentation use:

`> npm run docs`

Then open `./docs/index.html`


Example
-------

To run the application:

`> npm start`

by default the application will bind on port 3000 and a server to proxy on 3001

Details
=======

Requests from the proxy layer will be passed through to the default backend 
unless there is a configuration to do construction work for that route.

Routes are configured by adding JavaScript modules which are mounted on boot. 
Configuration is defined in a DSL like manner in which one can specify what
data and html fragments are needed to build the page, and any custom logic that 
is required to manipulate any response bodies or do any custom work during a 
request lifecycle.

Routes are mounted into the Koa web framework which actually handles all the  
work under the hood. The proxy uses the `koa-proxies` module
to handle stream proxying requests to the default backend when the routes are 
not handled by the proxy itself.

Error handling is determined by the context. For example, if a fragment needed 
to build a page fails to load and it is not `required`, then in its place an 
error message will be displayed but the page will still generate. However, 
if the fragment is marked as being `required`, then an error will be generated 
by the proxy for the whole page request. It is also possible to override the 
default fragment error placeholder message to specify the one that is more
relavent for the particular page if some content cannot be fetched (see below 
for more details).

View fragments can contain template interpolations. The `DoT.js` template
framework is used but instead of the default `{{...}}` syntax `[[...]]` is used 
instead to prevent conflicts with other common templating systems that maybe in
use in the HTML fragments. This can be changed by changing the default DoT.js
options.

See http://olado.github.io/doT/index.html

Route order configuration
-------------------------

The proxy will respond on certain routes, as specified in the following configuration.
any requests that go to the proxy that are not configured in this configuration
will automatically be sent on to the default backend server.

Routes are configured in the `routes/modules.js` file. The format of the routes
is the string path to the file that defines the module containing the `Route` logic
or a path ending with an asterisk which implies that all javascript files under 
this path should be loaded recursively (and are assumed to export `Route` modules). 
The order in which the routes are applied in the koa framework is the order 
in which they are specified from first to last, and in the case of routes ending 
in an asterisk then the order of the included sub routes is not defined.

DSL Documentation
=================

Getting started
---------------

Configuring Fragments
---------------------

Adding custom behaviour
-----------------------

Detailed docs
-------------
For detailed description of the methods and their configuration options see the 
docs generated from the source code (`npm run make-docs`).

License
-------

See `UNLICENSE`
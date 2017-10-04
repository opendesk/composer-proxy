const Koa = require('koa');
const Router = require('koa-router');

const router = new Router();
router.get('/', function (ctx, next) {
  ctx.body = '<h1>Hi</h1>';
});

router.get('/fragment/base', function (ctx, next) {
  ctx.body = '<h1>base template</h1><fragment-inject fragment-name="greeter"></fragment-inject>';
});

router.get('/fragment/html', function (ctx, next) {
  ctx.body = '<p>embedded template</p><fragment-inject template models="dataModel" fragment-repeat="dataModel.data.array"><p>embed [[=model.current.name]]</p></fragment-inject>';
});

router.get('/api/data', function (ctx, next) {
  ctx.body = {
    data: {
      array: [
        { name: 'test 1' },
        { name: 'test 2' }
      ]
    }
  }
});


const port = 3001;
const app = new Koa();
app.use(router.routes()).use(router.allowedMethods());
app.listen(port);

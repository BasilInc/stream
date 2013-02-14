var http = require('http')
  , path = require('path')
  , express = require('express')
  , gzippo = require('gzippo')
  , derby = require('derby')
  , app = require('../app')
  , serverError = require('./serverError')
  , MongoStore = require('connect-mongo')(express)
  , Imap = require('imap')
  , storeDbUri = 'mongodb://localhost/stream_sessions'
  , dbUri = 'mongodb://localhost/stream'

// SERVER CONFIGURATION //

var expressApp = express()
  , server = module.exports = http.createServer(expressApp)

derby.use(derby.logPlugin);
derby.use('racer-db-mongo');

var store = derby.createStore({
  listen: server,
  db: {
    type: 'Mongo',
    uri: dbUri
  }
});

var ONE_YEAR = 1000 * 60 * 60 * 24 * 365
  , root = path.dirname(path.dirname(__dirname))
  , publicPath = path.join(root, 'public')

var auth = require('derby-auth'),
    strategies = {},
    options = {
      domain: 'http://localhost:3000'
    };

expressApp
  .use(express.favicon())
  // Gzip static files and serve from memory
  .use(gzippo.staticGzip(publicPath, {maxAge: ONE_YEAR}))
  // Gzip dynamically rendered content
  .use(express.compress())

  // Uncomment to add form data parsing support
  .use(express.bodyParser())
  .use(express.methodOverride())

  // Uncomment and supply secret to add Derby session handling
  // Derby session middleware creates req.model and subscribes to _session
  .use(express.cookieParser())
  .use(store.sessionMiddleware({
    secret: process.env.SESSION_SECRET || 'YOUR SECRET HERE',
    cookie: {maxAge: ONE_YEAR},
    store: new MongoStore({url: dbUri})
  }))

  // Adds req.getModel method
  .use(store.modelMiddleware())
  .use(auth(store,strategies,options))
  // Creates an express middleware from the app's routes
  .use(app.router())
  .use(expressApp.router)
  .use(serverError(root))


// SERVER ONLY ROUTES //

expressApp.get('/email',function(req,res){
  res.redirect('/');
});

expressApp.all('*', function(req) {
  throw '404: ' + req.url
})

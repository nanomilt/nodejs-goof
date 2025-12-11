import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Module dependencies.
 */

// mongoose setup
require('./mongoose-db');
require('./typeorm-db');

const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');

const st = require('st');
// var crypto = require('crypto');
const express = require('express');
const ejsEngine = require('ejs-locals');
const bodyParser = require('body-parser');
// var session = require('express-session')
const methodOverride = require('method-override');
const logger = require('morgan');
const errorHandler = require('errorhandler');
// var optional = require('optional');
const marked = require('marked');
const fileUpload = require('express-fileupload');
// var dust = require('dustjs-linkedin');
const dustHelpers = require('dustjs-helpers');
const cons = require('consolidate');
const hbs = require('hbs');
const csrf = require('csurf');


const app = express();
const routes = require('./routes');
const routesUsers = require('./routes/users.js');

// all environments
app.set('port', process.env.PORT || 3001);
app.engine('ejs', ejsEngine);
app.engine('dust', cons.dust);
app.engine('hbs', hbs.__express);
cons.dust.helpers = dustHelpers;
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(methodOverride());
app.use(require('express-session')({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  name: 'connect.sid',
  cookie: {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    domain: process.env.COOKIE_DOMAIN || undefined,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
  resave: false,
  saveUninitialized: false,
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(fileUpload());

// CSRF Protection
const csrfProtection = csrf({ cookie: false });
app.use(csrfProtection);

// Make CSRF token available to all views
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// Routes
app.use(routes.current_user);
app.get('/', routes.index);
app.get('/login', routes.login);
app.post('/login', routes.loginHandler);
app.get('/admin', routes.isLoggedIn, routes.admin);
app.get('/account_details', routes.isLoggedIn, routes.get_account_details);
app.post('/account_details', routes.isLoggedIn, routes.save_account_details);
app.get('/logout', routes.logout);
app.post('/create', routes.create);
app.get('/destroy/:id', routes.destroy);
app.post('/update/:id', routes.update);
app.post('/import', routes.import);
app.get('/about_new', routes.about_new);
app.get('/chat', routes.chat.get);
app.put('/chat', routes.chat.add);
app.delete('/chat', routes.chat.delete);
app.use('/users', routesUsers);

// Static
app.use(st({ path: './public', url: '/public' }));

// Add the option to output (sanitized!) markdown
marked.setOptions({ sanitize: true });
app.locals.marked = marked;

// development only
if (app.get('env') == 'development') {
  app.use(errorHandler());
}

const token = process.env.SECRET_TOKEN || 'SECRET_TOKEN_f8ed84e8f41e4146403dd4a6bbcea5e418d23a9';
console.log(`token: ${ token}`);

// Use HTTPS in production, HTTP in development
if (process.env.NODE_ENV === 'production') {
  const httpsOptions = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH || './key.pem'),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH || './cert.pem'),
  };
  https.createServer(httpsOptions, app).listen(app.get('port'), () => {
    console.log(`Express server listening on port ${ app.get('port') } (HTTPS)`);
  });
} else {
  http.createServer(app).listen(app.get('port'), () => {
    console.log(`Express server listening on port ${ app.get('port') } (HTTP - Development Only)`);
  });
}
var http = require('http')
  , path = require('path')
  , express = require('express')
  , gzippo = require('gzippo')
  , derby = require('derby')
  , app = require('../app')
  , serverError = require('./serverError')
  , MongoStore = require('connect-mongo')(express)
  , Imap = require('imap')
  , MailParser = require('mailparser').MailParser
  , GetMail = require('./get_mail')
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
expressApp.post('/email', function(req,res) {
  if(!req.body.email || !req.body.password) {
    return res.redirect('/');
  }

  var model = req.getModel(),
      userPath = 'users.'+model.session.userId;

  model.fetch(userPath, function(err, user) {
    console.log('Model Fetch');
    if(err) die(err);
    // var imap = new Imap({
    //     user: req.body.email,
    //     password: req.body.password,
    //     host: 'imap.gmail.com',
    //     port: 993,
    //     secure: true
    //   });

    // connectToInbox(imap);
    GetMail(user,req.body.email,req.body.password);
  });

  res.redirect('/');
});

function connectToInbox(imap) {
  // imap.connect(openInbox.bind(null,imap));
  imap.connect(openInbox);
}

function openInbox(imap,err) {
  console.log(arguments)
  // imap.openBox('INBOX',true,searchInbox.bind(null,imap));
}













  // searchInbox : function(err, mailbox){
  //   console.log('Searching inbox');
  //   if(err) die(err);
  //   GetEmail._imap.search(['ALL', ['SINCE',GetEmail._lastRead.toString()]], GetEmail.fetchEmails)
  // },

  // fetchEmails : function(err, results) {
  //   console.log('Fetching Emails')
  //   if(err) die(err);
  //   GetEmail._imap.fetch(results, {
  //     request: {
  //       body : true
  //     },
  //     cb : function(fetch) {
  //       fetch.on('message', function(message) {
  //         mailparser = new MailParser();
  //         mailparser.on('end',function(mailObj){
  //           console.log(mailObj);
  //         });

  //         message.on('data',function(chunk){
  //           console.log(chunk)
  //           mailparser.write(chunk.toString());
  //         });
          
  //         message.on('end',function(){
  //           mailparser.end();
  //         });
  //       });
  //     }}, function(){
  //       GetEmail._user.set('emailsLastReadAt', new Date);
  //       GetEmail._user.set('reading', false);
  //     }
  //   );
  // }

// expressApp.post('/email',function(req,res){
//   if( !req.body.email && !req.body.password) {
//     return res.redirect('/');
//   }

//   var model = req.getModel(),
//       userPath = 'users.' + model.session.userId,
//       messagesPath = userPath+'.messages',
//       lastRead = new Date(new Date().setDate(new Date().getDate()-1)),
      
//       imap = new Imap({
//         user: req.body.email,
//         password: req.body.password,
//         host: 'imap.gmail.com',
//         port: 993,
//         secure: true
//       });

//   // Grab last read at
//   model.fetch(userPath,function(err, user){
//     var lastReadAt = user.get('emailsLastReadAt');
//     if(lastReadAt) {
//       lastRead = new Date(lastReadAt);
//     }
//     model.at(userPath).set('reading',true);

//     imap.connect(function(err) {
//       //if(err) die(err);
//       imap.openBox('INBOX', true, function(err, mailbox){
//         //if(err) die(err);
//         console.log('Last Read: '+lastRead.toString());
//         imap.search(['ALL', ['SINCE', lastRead.toString()]], function(err, results){
//           //if(err) die(err);
//           var fetch = imap.fetch(results,{
//             request: {
//               body: true
//             },
//             cb: function(fetch){

//             fetch.on('message', function(message){
//               mailparser = new MailParser();
//               mailparser.on('end',function(mailObj){
//                 console.log(mailObj);
//               });

//               message.on('data',function(chunk){
//                 console.log(chunk)
//                 mailparser.write(chunk.toString());
//               });
              
//               message.on('end',function(){
//                 mailparser.end();
//               });
//             });
//           }}, function(){
//             model.at(userPath).set('reading',false);
//           });
//         });
//       });
//     });
//   });
//   model.at(userPath).set('readEmails',true);
//   res.redirect('/');
// });


// expressApp.post('/email',function(req,res){
//   if( !req.body.email && !req.body.password) {
//     return res.redirect('/');
//   }

//   var model = req.getModel(),
//       userPath = 'users.' + model.session.userId,
//       messagesPath = userPath+'.messages',
//       lastRead = new Date(new Date().setDate(new Date().getDate()-1)),
//       mailparser = new MailParser(),
//       imap = new Imap({
//         user: req.body.email,
//         password: req.body.password,
//         host: 'imap.gmail.com',
//         port: 993,
//         secure: true
//       });

//   // Grab last read at
//   model.fetch(userPath,function(err, user){
//     var lastReadAt = user.get('emailsLastReadAt');
//     if(lastReadAt) {
//       lastRead = new Date(lastReadAt);
//     }
//     model.at(userPath).set('reading',true);
    
//     imap.connect(function(err) {
//       if(err) die(err);
//       imap.openBox('INBOX', true, function(err, mailbox){
//         if(err) die(err);
//         console.log('Last Read: '+lastRead.toString());
//         imap.search(['ALL', ['SINCE', lastRead.toString()]], function(err, results){
//           if(err) die(err);
          
//           imap.fetch(results,{
//             headers : ['from','subject','date'],
//             cb : function(fetch) {
//               fetch.on('message', function(msg) {

//                 msg.on('headers', function(hdrs) {
//                   model.push(messagesPath, {
//                     from:     hdrs.from[0],
//                     subject:  hdrs.subject[0],
//                     date:     hdrs.date,
//                     body:     'Coming Soon....'
//                   });
//                 });
//                 // msg.on('data', function(chunk) {
//                 //   body += chunk.toString('utf8');
//                 // });
//                 // msg.on('data', function(chunk){
//                 //   mailparser.write(chunk.toString());
//                 // });
//                 msg.on('end', function() {
//                   // mailparser.end();
//                 });
//               });

//               fetch.on('end', function(){
//                 model.at(userPath).set('reading',false);
//               })
//             }
//           });
          
//         });
//       });
//     });

//     //Set last read if null to yesterday
//     model.at(userPath).set('emailsLastReadAt', (new Date()).toString());
//   });

//   // mailparser.on('headers', function(headers) {
//   //   console.log('Saving');
//   //   console.log(headers);
//   // });
//   // mailparser.on("end", function(mail){
//   //   console.log('Saving');
//   //   console.log(mail.headers);
//   //   // model.push(messagesPath, {
//   //   //   from:     mail.from,
//   //   //   subject:  mail.subject,
//   //   //   date:     mail.date,
//   //   //   body:     mail.html
//   //   // });
//   // });
  
//   model.at(userPath).set('readEmails',true);
//   res.redirect('/');
// });

expressApp.all('*', function(req) {
  throw '404: ' + req.url
})







// imap.connect(function(err) {
//   if (err) die(err);
//   imap.openBox('INBOX', true, function(err, mailbox){
//     if (err) die(err);

//     imap.fetch(results, {
//       headers: ['from']
//     })
//   });
// });









//  if (err) die(err);
//   imap.search([ 'UNSEEN', ['SINCE', 'May 20, 2010'] ], function(err, results) {
//     if (err) die(err);
//     imap.fetch(results,
//       { headers: ['from', 'to', 'subject', 'date'],
//         cb: function(fetch) {
//           fetch.on('message', function(msg) {
//             console.log('Saw message no. ' + msg.seqno);
//             msg.on('headers', function(hdrs) {
//               console.log('Headers for no. ' + msg.seqno + ': ' + show(hdrs));
//             });
//             msg.on('end', function() {
//               console.log('Finished message no. ' + msg.seqno);
//             });
//           });
//         }
//       }, function(err) {
//         if (err) throw err;
//         console.log('Done fetching all messages!');
//         imap.logout();
//       }
//     );
//   });
var derby = require('derby')
  , app = derby.createApp(module)
  , get = app.get
  , view = app.view
  , ready = app.ready
  , start = +new Date()

derby.use(require('../../ui'))
derby.use(require('derby-ui-boot'))
derby.use(require('derby-auth/components'))

// ROUTES //

// Derby routes can be rendered on the client and the server
get('/',function(page, model, params) {
  var userPath = 'users.' + model.session.userId;
  console.log(userPath)
  model.subscribe(userPath, function(err, user) {
    model.ref('_user',user);
    page.render();
  });
});


// CONTROLLER FUNCTIONS //

ready(function(model) {
  
  this.deleteEmails = function() {
    model.set('_user.messages', []);
    return false;
  }

  this.setUnreading = function() {
    model.set('_user.reading',false);
    return false;
  }
});

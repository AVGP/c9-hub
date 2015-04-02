'use strict';

var workspaces = require('../controllers/workspaces');
var authorization = require('./middlewares/authorization');

module.exports = function(app, passport) {
    app.get('/workspace', authorization.requiresLogin, workspaces.list);
    app.post('/workspace', authorization.requiresLogin, workspaces.create);
    app.get('/workspace/:name', authorization.requiresLogin, workspaces.run);
    app.post('/workspace/:name/keepalive', authorization.requiresLogin, workspaces.keepAlive);
    app.delete('/workspace/:name', authorization.requiresLogin, workspaces.destroy);


        // show the login form
        app.get('/login', function (req, res) {
            res.render('login.ejs', {message: req.flash('loginMessage')});
        });

        // show the login form
        app.get('/signup', function (req, res) {
            res.render('signup.ejs', {message: req.flash('loginMessage')});
        });

    // process the login form
    app.post('/login', passport.authenticate('local-login', {
        successRedirect: '/#/dashboard', // redirect to the secure profile section
        failureRedirect: '/login', // redirect back to the signup page if there is an error
        failureFlash: true // allow flash messages
    }));


    // process the signup form
    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect: '/login', // redirect to the secure profile section
        failureRedirect: '/signup', // redirect back to the signup page if there is an error
        failureFlash: true,// allow flash messages
        message: 'Please login with your new credentials. Thanks for signing up'
    }));

}

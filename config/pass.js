// config/auth.js

// expose our config directly to our application using module.exports
module.exports = {

    'facebookAuth' : {
        'clientID' 		: '1511163462453285', // your App ID
        'clientSecret' 	: 'a469ebd9b3ee882cd1578d26ee91b491', // your App Secret
        'callbackURL' 	: 'http://localhost:8080/auth/facebook/callback'
    },

    'twitterAuth' : {
        'consumerKey' 		: 'I9YLv8c0FJIYPACU5eYGRbcGW',
        'consumerSecret' 	: 'j9330GuivKIuwC3c8r3RfRNLycrDyZ2OfHFQEGW4h2zrLkdElY',
        'callbackURL' 		: 'http://localhost:8080/auth/twitter/callback'
    },

    'googleAuth' : {
        'clientID' 		: '233449258545-tura73svarjsatjmc13v4q6oojqknhbg.apps.googleusercontent.com',
        'clientSecret' 	: 'Gmt7k6MzSWJ3ZSANiqU7OCAG',
        'callbackURL' 	: 'http://localhost:8080/auth/google/callback'
    }

};
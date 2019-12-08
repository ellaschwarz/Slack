const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs')

function initialize(passport, getUserByUsername) {
   const authenticateUser = (username, password, done) => {
      const user = getUserByUsername(username);
      if (user == null) {
         return done(null, false, { message: 'No user whit that username'});
      }

      bcrypt.compare(password, user.password, function(err, res) {
         if (err) return done(err);
         if (res === true) {
            return done(null, user);
         } else {
            return done(null, false, { message: 'Password incorrect' });
         }
      });

   }

   passport.use(new LocalStrategy({ usernameField: 'username'}, authenticateUser));
   passport.serializeUser((user, done) => { });
   passport.deserializeUser((id, done) => { });
}

module.exports = initialize;

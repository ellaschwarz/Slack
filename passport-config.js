/* const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs')

function initialize(passport, getUserByUsername) {
   const authenticateUser = async (username, password, done) => {
      const user = getUserByUsername(username);
      if (user == null) {
         return done(null, false, { message: 'No user whit that username'});
      }

      try {
         if (await bcrypt.compare(password, user.password)) {
            return done(null, user)
         } else {
            return done(null, false, { message: 'Password incorrect'})
         }
      } catch (e) {
         return done(e)
      }
   }

   passport.use(new LocalStrategy({ usernameField: 'username'}, authenticateUser));
   passport.serializeUser((user, done) => { });
   passport.deserializeUser((id, done) => { });
}

module.exports = initialize;
 */


const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcryptjs')

function initialize(passport, getUserByEmail, getUserById) {
  const authenticateUser = async (email, password, done) => {
    const user = getUserByEmail(email)
    if (user == null) {
      return done(null, false, { message: 'No user with that email' })
    }

    try {
      if (await bcrypt.compare(password, user.password)) {
        return done(null, user)
      } else {
        return done(null, false, { message: 'Password incorrect' })
      }
    } catch (e) {
      return done(e)
    }
  }

  passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser))
  passport.serializeUser((user, done) => done(null, user.id))
  passport.deserializeUser((id, done) => {
    return done(null, getUserById(id))
  })
}

module.exports = initialize
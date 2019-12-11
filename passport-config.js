const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcryptjs')

function initialize(passport, getUserByX, getUserById) {
  const authenticateUser = async (userOrMail, password, done) => {
    const user = getUserByX(userOrMail)
    if (user == null) {
      return done(null, false, { message: 'No user with that username or email' })
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

  // 'usernameField' comes from login.ejs POST
  passport.use(new LocalStrategy({ usernameField: 'user-or-email' }, authenticateUser))

  passport.serializeUser((user, done) => done(null, user.id))
  passport.deserializeUser((id, done) => {
    return done(null, getUserById(id))
  })
}

module.exports = initialize
const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcryptjs')

function initialize(passport, getUserByX, getUserById) {
  const authenticateUser = async (userOrMail, password, done) => {
      console.log('userOrMail se pasa como parametro ' + userOrMail)
    const user = getUserByX(userOrMail)
    console.log('user: ' + user)
    if (user == null) {
        console.log('User es null: ' + (user == null))
      return done(null, false, { message: 'No user with that email' })
    }

    try {
        console.log('User es null: ' + (user == null))
      if (await bcrypt.compare(password, user.password)) {
        return done(null, user)
      } else {
        return done(null, false, { message: 'Password incorrect' })
      }
    } catch (e) {
      return done(e)
    }
  }

//  'usernameField' comes from login.ejs POST
  passport.use(new LocalStrategy({ usernameField: 'user-or-email' }, authenticateUser))

  passport.serializeUser((user, done) => done(null, user.id))
  passport.deserializeUser((id, done) => {
    return done(null, getUserById(id))
  })
}

module.exports = initialize
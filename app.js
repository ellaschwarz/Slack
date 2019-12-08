if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const ejs = require('ejs');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const methodOverride = require('method-override');

const initializePassport = require('./passport-config');
initializePassport(
    passport, 
    email => users.find(user => user.email === email),
    id => users.find(user => user.id === id)
);

const Message = require('./models/messages');
const Room = require('./models/rooms');
const User = require('./models/users');

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/Slack', { useUnifiedTopology: true, useNewUrlParser: true, useCreateIndex: true });
let db = mongoose.connection;


app.set('views', './views');
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false}));
app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));


let users = [];
let onlineUsersArray = [];
let rooms = [];
let usersOnline = 0;

db.on('error', err => {
    console.log('Connection error' + err);
}).once('open', () => {
    console.log('Connection has been made to database');
    User.find({}).then(result => {
        result.forEach(user => {
            users.push(user);
        });
        console.log('users: ' + users);
    });
    Room.find({}).then(result => {
        result.forEach(room => {
            rooms.push(room.name);
            console.log(room.name);
        });
        console.log('rooms: ' + rooms);
    });
    
});


//////////////////////////////////////////////////////////
app.get('/', checkAuthenticated, (req, res) => {
    res.render('index.ejs', {name: req.user.username, rooms: rooms, onlineUsersArray:onlineUsersArray});
});

app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render('login.ejs');
});

app.post('/login', checkNotAuthenticated ,passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}));

app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('register.ejs');
});

app.post('/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        let user = new User({
            username: req.body.name,
            email: req.body.email,
            password: hashedPassword
        });
        user.save().then(() => console.log('User saved'));
        res.redirect('/login');
    } catch {
        res.redirect('/register');
    }
});

app.delete('/logout', (req, res) => {
    req.logOut();
    res.redirect('/login');
});



io.on('connection', socket => {
    usersOnline++;
    io.sockets.emit('broadcastOnlineUsers', {description: usersOnline + ' users online'});
    // FIND A WAY TO WRITE ALL ONLINE USERS

    socket.on('disconnect', () => {
        usersOnline--;
        io.sockets.emit('broadcastOnlineUsers', {description: usersOnline + ' users online'});
    });

    socket.on('msg', data => {
        console.log(data);
        // Send message to users in room
        socket.to(data.room).emit('newmsg', {msg: data.message, user: data.user});

        let message = new Message({
            user: data.user,
            room: data.room,
            message_body: data.message
        });
        
        message.save().then(() => console.log('Message saved'));
    });

    socket.on('new-room', data => {
        
        if(rooms.indexOf(data) > -1) {
            socket.emit('room-exists', data + 'has already been created! Try an other name');
        } else {

            rooms.push(data);
            io.emit('room-set', data);
            let room = new Room({
                name: data
            });
            room.save().then(() => {
                console.log('Room saved: ' + room);
            });
        }
        
    });

    socket.on('room-entered', data => {
        socket.leaveAll();
        socket.join(data.room);
        // Send message that someone joined the room
        socket.to(data.room).emit('connect-to-room', data.user + ' joined the room');
    });
});

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    next();
}

http.listen(3000, () => {
    console.log('listening on *:3000');
});
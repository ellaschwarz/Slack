if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const ejs = require('ejs');
const path = require('path');
const bodyParser = require('body-parser');
const requestPromise = require('request-promise');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');

const initializePassport = require('./passport-config');
initializePassport(
    passport, 
    name => users.find(user => user.name === name)
);

app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(bodyParser.json());
app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname, 'public')));

app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    console.log('I was served');
    res.render('login.ejs');
});

app.get('/login', (req, res) => {
    res.render('login.ejs');
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/index',
    failureRedirect: '/login',
    failureFlash: true
}));

app.get('/register', (req, res) => {
    res.render('register.ejs');
});


app.post('/register', (req, res) => {

    // Encrypt password then save all info on array
    bcrypt.genSalt(10, (err, salt) => {
        if (err) console.error(err);
        bcrypt.hash(req.body.password, salt, (err, hash) => {
            if (err) console.error(err);
            users.push({
                id: Date.now().toString(),
                username: req.body.username,
                email: req.body.email,
                password: hash
            });
            res.redirect('/login');
            console.log(users);
        });
    });
});
 

app.get('/index', (req, res) => {
    res.render('index')
});

let users = []; // temporary instead database
let rooms = [];
let usersOnline = 0;

io.on('connection', socket => {
    usersOnline++;
    io.sockets.emit('broadcastOnlineUsers', {description: usersOnline + ' users online'});

    socket.on('adduser', function (user) {
        socket.username = user;
        console.log(user);
        io.sockets.emit('adduser', user)
   

    // socket.on('adduser', (user) => {
    //     socket.broadcast.emit('showOnline', 'User is online: ' +user);
    // });
})

    socket.on('disconnect', () => {
        usersOnline--;
        io.sockets.emit('broadcastOnlineUsers', {description: usersOnline + ' users online'});
    });

    socket.on('msg', data => {
        console.log(data);
        // Send message to users in room
        socket.to(data.room).emit('newmsg', {msg: data.message, user: data.user});
    });

    socket.on('new-room', data => {
        
        if(rooms.indexOf(data) > -1) {
            socket.emit('room-exists', data + 'has already been created! Try an other name');
        } else {
            rooms.push(data);
            io.emit('room-set', data);

        }
        
    });

    socket.on('room-entered', data => {
        console.log('You entered room ' + data);
        socket.leaveAll();
        socket.join(data);
        // Send message that someone joined the room
        socket.to(data).emit('connect-to-room', 'Name of user joined the room');
    });
});



http.listen(3000, () => {
    console.log('listening on *:3000');
});
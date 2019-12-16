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
const methodOverride = require('method-override');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const Message = require('./models/messages');
const Room = require('./models/rooms');
const User = require('./models/users');

const mongoose = require('mongoose');
const mongo = require("mongodb");
const monk = require("monk");
const messageDB = monk('localhost:27017/Slack');

const emoji = require('node-emoji');

const initializePassport = require('./passport-config');

initializePassport(
    passport,
    // Look after for an '@' on input to decide how to compare: username or email
    mailOrUser =>
        mailOrUser.search('@') < 0 ?
            users.find(user => user.username === mailOrUser) :
            users.find(user => user.email === mailOrUser),

    id => users.find(user => user.id === id)
);

mongoose.connect('mongodb://localhost/Slack', { useUnifiedTopology: true, useNewUrlParser: true, useCreateIndex: true });
let db = mongoose.connection;

app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(bodyParser.json());

//Gör vår databas tillgänglig för routen
app.use(function (req, res, next) {
    req.db = messageDB;
    next();
});

app.set('views', './views');
app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: false }));
app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));

app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

let users = [];
/* let usersOnlineArray = []; */
let rooms = [];
let usersOnline = 0;
let usersOnlineArray2 = [];

db.on('error', err => {
    console.log('Connection error' + err);
}).once('open', () => {
    console.log('Connection has been made to database');
    loadMongoUsersIntoArray();
    /*     User.find({}).then(result => {
            result.forEach(user => {
                users.push(user);
            });
        }); */

    Room.find({}).then(result => {
        result.forEach(room => {
            rooms.push(room.name);
        });
    });
});

app.post('/message', (req, res) => {
    let DB = req.db;

    let user = req.body.username;
    let room = req.body.room;
    let message_body = req.body.message_body;

    let collection = DB.get('messages')

    collection.insert({
        "user": user,
        "room": room,
        "message_body": message_body
    }, function (err, doc) {
        if (err) {
            res.send('Can not add information to database')
        } else {
            res.send('200')
        }
    });
});

// //Hanterar post-request
// app.post('/message', async (req, res) => {
//     let DB = req.db;
//     let collection = DB.get('messages');
//     collection.find(
//         {'username': req.body.username},
//         {}).then(user => {
//             if(user[0]) {
//                 if(user[0].password == req.body.password) {
//                     res.send(true)
//                 } else {
//                     res.send(false)
//                 } 
//             } else {
//                 res.send(false)
//             }
//     });
// });

app.get('/message', (req, res) => {
    let DB = req.db;
    let collection = DB.get('messages');
    collection.find({}, {}, function (e, messages) {
        console.log(messages);
        res.json(messages);

    });
});

app.get('/', checkAuthenticated, (req, res) => {
    res.render('index', { name: req.user.username, rooms: rooms, });

});

app.get('/login', /*checkNotAuthenticated,*/(req, res) => {
    res.render('login.ejs');
});

app.post('/login', /*checkNotAuthenticated,*/ passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}));

// app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
//     successRedirect: '/',
//     failureRedirect: '/login',
//     failureFlash: true
// }));

app.get('/register', /*checkNotAuthenticated,*/(req, res) => {
    res.render('register.ejs');
});

app.post('/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        let user = new User({
            username: req.body.username,
            email: req.body.email,
            password: hashedPassword
        });
        user.save().then(() => {
            console.log('User saved');
            loadMongoUsersIntoArray();
        });
        res.redirect('/login');
    } catch {
        res.redirect('/register');
    }
});

app.get('/index', checkAuthenticated, (req, res) => {
    res.render('index')
});

app.delete('/logout', (req, res) => {
    req.logOut();
    res.redirect('/login');
});

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/index');
    }
    next();
}

function loadMongoUsersIntoArray() {
    User.find({}).then(result => {
        users = [];
        result.forEach(user => {
            users.push(user);
        });
        console.log('Users on array: ' + users.length) // Delete
    });
}

io.on('connection', socket => {
    /* socket.name = 'Random name';
    console.log(socket.name);
    
    // Check for online sockets
    setInterval(function() {
        let clientsOnline = findClientsSocket();
        clientsOnline.forEach(function(arrayItem) {
            let x = arrayItem.id;
            console.log('online: ' + x);
        });
        console.log('----------------------------');
    }, 5000); */

    usersOnline++;
    io.sockets.emit('broadcastOnlineUsersConnect', { description: usersOnline + ' users online', id: socket.id });

    socket.on('user-online', data => {
        let user = {
            name: data.name,
            id: data.id
        }
        socket.name = user.name;

        // Check for online sockets
        setInterval(function () {
            usersOnlineArray2 = [];
            let clientsOnline = findClientsSocket();
            clientsOnline.forEach(function (arrayItem) {
                let y = arrayItem.name;
                let x = arrayItem.id;
                let userOnline = {
                    name: y,
                    id: x
                }
                usersOnlineArray2.push(userOnline);
            });
            // console.log(usersOnlineArray2);
            // console.log('----------------------------');
            io.sockets.emit('all-connected-users', usersOnlineArray2);
        }, 1000);
    });

    socket.on('disconnect', () => {

        usersOnline--;
        io.sockets.emit('broadcastOnlineUsersDisconnect', { description: usersOnline + ' users online', id: socket.id });
        // Remove this user from usersOnlineArray
        /* for (let i = 0; i < usersOnlineArray.length; i++) {
            if (usersOnlineArray[i].id == socket.id) {
                usersOnlineArray.splice(i, 1);
                break;
            }
        } */
    });

    socket.on('msg', data => {
        emojified = emoji.emojify(data.message)

        // Send message to users in room
        socket.to(data.room).emit('newmsg', { msg: emojified, user: data.user });

        let message = new Message({
            user: data.user,
            room: data.room,
            message_body: emojified
        });

        message.save().then(() => console.log('Message saved'));
    });

    //Privte message
    socket.on('private-msg', data => {
        // let socketId = users[data.receiver];
        // Send message to users in room
        io.to(`${socketId}`).emit('newmsg', { msg: data.message, user: data.user });

        let message = new Message({
            user: data.user,
            room: data.room,
            message_body: data.message
        });

        message.save().then(() => console.log('Message saved'));
    });

    socket.on('new-room', data => {

        if (rooms.indexOf(data) > -1) {
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
        console.log('socket.id ' + socket.id);
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

function findClientsSocket(roomID, namespace) {
    let res = [];
    let ns = io.of(namespace || '/');
    if (ns) {
        for (let id in ns.connected) {
            if (roomID) {
                let index = ns.connected[id].rooms.indexOf(roomID);
                if (index !== -1) {
                    res.push(ns.connected[id]);
                }
            } else {
                res.push(ns.connected[id]);
            }
        }
    }
    return res;
}

http.listen(3000, () => {
    console.log('listening on *:3000');
});



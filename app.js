if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
//////
const crypto = require('crypto');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
//////

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
const PrivateRoom = require('./models/privaterooms');

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

/////////////////////////// EMOJI DEL ////////////////////////////
let emojiList = ['heart_eyes',
    'grin',
    'joy',
    'pensive',
    'cry',
    'rage',
    'expressionless',
    'zipper_mouth_face',
    'money_mouth_face',
    'face_with_thermometer',
    'nerd_face',
    'thinking_face',
    'cold_sweat',
    'scream',
    'astonished',
    'flushed',
    'sleeping',
    'dizzy_face',
    'no_mouth',
    'face_with_rolling_eyes',
    'rolling_on_the_floor_laughing',
    'woman-shrugging',
    'man-shrugging',
    'woman-facepalming',
    'man-facepalming',
    'see_no_evil',
    'hear_no_evil',
    'speak_no_evil',
    'heartpulse']
let emojiToShow = []

loadEmojiArray(emojiList)

function loadEmojiArray(arrayText) {
    for (const iterator of arrayText) {
        emojiToShow.push(emoji.get(iterator))
    }
}

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
let rooms = [];
let privateRooms = [];
let usersOnline = 0;
let usersOnlineArray2 = [];
let messagesInThisRoom = [];
let yourPrivateRooms = [];
let privateRoomsCheck = [];

db.on('error', err => {
    console.log('Connection error' + err);
}).once('open', () => {
    console.log('Connection has been made to database');
    loadMongoUsersIntoArray();

    Room.find({}).then(result => {
        result.forEach(room => {
            rooms.push(room.name);
        });
    });

    // Private rooms check
    PrivateRoom.find({}).then(result => {
        result.forEach(privateRoom => {
            yourPrivateRooms.push(privateRoom);
            privateRoomsCheck.push(privateRoom.name);
        });
        console.log(yourPrivateRooms);
    });

});


/////////////////////////////////
app.post('/upload', (req, res) => {
    let user = req.user;

    // Set storage engine

    const storage = multer.diskStorage({
        destination: './public/uploads/',
        filename: function (req, file, cb) {
            cb(null, user.username + '-' + user.id + path.extname(file.originalname));
        }
    });


    // Initialize upload
    const upload = multer({
        storage: storage,
        limits: { fileSize: 10000000 },
        fileFilter: function (req, file, cb) {
            checkFileType(file, cb);
        }
        // User name here instead of myImage
    }).single('myImage');


    upload(req, res, (err) => {
        if (err) {
            res.render('profil', { msg: err, username: user.username, useremail: user.email, userid: user.id });
        } else {
            if (req.file == 'undefined') {
                res.render('profil', {
                    msg: 'Error: No File Selected!',
                    username: user.username,
                    useremail: user.email,
                    userid: user.id
                });
            } else {
                res.render('profil', {
                    msg: 'File Uploaded!',
                    file: `uploads/${req.file.filename}`,
                    username: user.username,
                    useremail: user.email,
                    userid: user.id
                });
            }
        }
    });
});

function checkFileType(file, cb) {
    // Allowed extensions
    const filetypes = /jpeg|jpg/;
    // check extension
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // check Mime type
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: images Only with jpg extension!');
    }
}

app.get('/profil', checkAuthenticated, (req, res) => {
    let user = req.user;
    res.render('profil.ejs', { username: user.username, useremail: user.email, useractualpassword: user.password, userid: user.id });
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

app.get('/message', (req, res) => {
    let DB = req.db;
    let collection = DB.get('messages');
    collection.find({}, {}, function (e, messages) {
        console.log(messages);
        res.json(messages);

    });
});

app.get('/', checkAuthenticated, (req, res) => {
    res.render('index', { name: req.user.username, rooms: rooms, userid: req.user.id, emojis: emojiToShow, privaterooms: yourPrivateRooms });
});

app.get('/login', /*checkNotAuthenticated,*/(req, res) => {
    res.render('login.ejs');
});

app.post('/login', /*checkNotAuthenticated,*/ passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}));

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
    res.render('index');
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

    usersOnline++;
    io.sockets.emit('broadcastOnlineUsersConnect', { description: usersOnline + ' users online', id: socket.id });

    socket.on('user-online', data => {
        let user = {
            name: data.name,
            id: data.id
        }
        socket.name = user.name;

        /* // Private rooms check
        yourPrivateRooms = [];
        PrivateRoom.find({ users: user.name }).then(result => {
            result.forEach(privateRoom => {
                yourPrivateRooms.push(privateRoom.name);
            });
            console.log(yourPrivateRooms);

            socket.emit('private-rooms-update', {privaterooms: yourPrivateRooms});
        }); */


        let yourActualprivateRooms = [];
        for (let privateRoom of yourPrivateRooms) {
            for (let user of privateRoom.users) {
                if (user == socket.name) {
                    console.log(privateRoom.name);
                    yourActualprivateRooms.push(privateRoom.name);
                }
            }

        }
        socket.emit('private-rooms-update', { privaterooms: yourActualprivateRooms });

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

            io.sockets.emit('all-connected-users', usersOnlineArray2);
        }, 3000);
    });

    socket.on('disconnect', () => {

        usersOnline--;
        io.sockets.emit('broadcastOnlineUsersDisconnect', { description: 'f007 ' + usersOnline + ' users online', id: socket.id });

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
        emptyArrayMessages();
        socket.leaveAll();
        socket.join(data.room);
        // Send message that someone joined the room
        socket.to(data.room).emit('connect-to-room', data.user + ' joined the room');
        // GET ALL MESSAGES SAVED IN DATABASE
        Message.find({ room: `${data.room}` }).then(result => {
            result.forEach(message => {
                messagesInThisRoom.push(message);
            });
            socket.emit('print-messages', { messages: messagesInThisRoom });
        });
    });

    socket.on('create-private-room', data => {
        // User clicked on his own name
        if (data.usernameTo === data.usernameFrom) {
            console.log('You cannot talk with yourself on the chat');
        } else {

            let newPrivateRoomName = compareStrings(data.usernameTo, data.usernameFrom);

            if (privateRoomsCheck.indexOf(newPrivateRoomName) > -1) {
                console.log('Already exists!!!');
            } else {
                privateRoomsCheck.push(newPrivateRoomName);
                // io.emit('room-set', data);
                let privateroom = new PrivateRoom({
                    name: newPrivateRoomName,
                    users: [data.usernameTo, data.usernameFrom]
                });
                yourPrivateRooms.push(privateroom);

                privateroom.save().then(() => {
                    console.log('PrivateRoom saved: ' + privateroom);
                });
                // emit to the 2 users
                io.to(`${socket.id}`).emit('private-room-set', newPrivateRoomName);
                io.to(`${data.userId}`).emit('private-room-set', newPrivateRoomName);
            }
        }

    });

    //Join private room för den som är receiver
    socket.on('private-room-entered', data => {
        emptyArrayMessages();
        socket.leaveAll();
        socket.join(data.room);
        // Send message that someone joined the room
        socket.to(data.room).emit('connect-to-room', data.usernameFrom + ' joined the private chat');

        Message.find({ room: `${data.room}` }).then(result => {
            result.forEach(message => {
                messagesInThisRoom.push(message);
            });
            console.log(messagesInThisRoom);
            socket.emit('print-messages', { messages: messagesInThisRoom });
        });
    });

    // Show when someone is typing
    socket.on('typingEvent', data => {
        console.log(data)
        console.log('Someone is writing' + data.room + ' ' + data.user + ' ' + data.status)
        socket.to(data.room).emit('typingEvent', { user: data.user, status: data.status });
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

function compareStrings(a, b) {
    let str1 = a;
    let str2 = b;
    let n = str1.localeCompare(str2);
    if (n == 1) {
        return b + ' - ' + a;
    }
    else if (n == -1) {
        return a + ' - ' + b;
    }
}

function emptyArrayMessages() {
    messagesInThisRoom = [];
}

http.listen(3000, () => {
    console.log('listening on *:3000');
});
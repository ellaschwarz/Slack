const express = require('express');
const app = express();
const http = require('http').createServer(app);
const mongoose = require('mongoose');
const cookieSession = require('cookie-session');
const bodyParser = require('body-parser');

const io = require('socket.io')(http);
const port = 3000;

mongoose.connect('mongodb://localhost/slackChat', { useUnifiedTopology: true, useNewUrlParser: true, useCreateIndex: true });
let db = mongoose.connection;

app.set('views', './views');
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true}));
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
    name: 'session',
    keys: ['key1', 'key2']
}));

const Message = require('./models/messages');
const Room = require('./models/rooms');
const User = require('./models/users');

const rooms = [];
const users = [];

db.on('error', err => {
    console.log('Connection error' + err);
}).once('open', () => {
    console.log('Connection has been made to database');
    Room.find({}).then(result => {
        result.forEach((room) => {
            let roomName = room.name;
            rooms.push(roomName);
        });
    });
});

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/chat', (req, res) => {
    res.render('chat', { rooms: rooms })
});

app.post('/', (req, res) => {
    let user = new User({
        username: req.body.username,
        email: req.body.useremail
    });
    users.push(user);
    req.session.username = req.body.username;
    console.log(req.session.username);
    console.log('Users: ' + users);
    /* user.save().then(() => console.log('User saved' + user)); */

    res.render('chat', { rooms: rooms, user : req.session.username});
});

app.post('/room', (req, res) => {
    let room = new Room({
        name: req.body.room
    });
    rooms.push(room.name);
    room.save().then(() => console.log('Room saved: ' + room));
    io.emit('room-created', req.body.room);
    res.render('chat', { rooms: rooms, user : req.session.username});
});

app.get('/:room', (req, res) => {
    res.render('room', {roomName : req.params.room, userName : req.session.username});
    
});

io.on('connection', socket => {
    console.log('connection');

    socket.on('enter-room', (room, user) => {
        //Skickar användaren till chattrum
        socket.join(room);
        console.log(typeof(room));
        console.log(user + ' You joined '+ room);
        /* rooms[room].users[socket.id] = userTemp; */

        ///////////////////////////////////////////////////////////////////////
        // Probleme here.
        socket.broadcast.emit('user-connected', user);
    });

    socket.on('send-chat-message', (room, message, user) => {
        
        // Create message Model
        let msg = new Message({
            user: user,
            room: room,
            message_body: message
        });
        console.log(msg);

        socket.broadcast.emit('chat message', {
            message: message, name: user
        });

        // Save message to database
        // msg.save().then(() => console.log('Message saved')); 
    


    });

    socket.on('disconnect', () => {
    });
});

http.listen(port, () => console.log('Listening on port ' + port));


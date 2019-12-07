const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const ejs = require('ejs');

const Message = require('./models/messages');
const Room = require('./models/rooms');
const User = require('./models/users');

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/Slack', { useUnifiedTopology: true, useNewUrlParser: true, useCreateIndex: true });
let db = mongoose.connection;


app.set('views', './views');
app.set('view engine', 'ejs');


let users = [];
let rooms = [];
let usersOnline = 0;

db.on('error', err => {
    console.log('Connection error' + err);
}).once('open', () => {
    console.log('Connection has been made to database');
    Room.find({}).then(result => {
        result.forEach(room => {
            rooms.push(room.name);
            console.log(room.name);
        });
        console.log(rooms);
    });
    
});

app.get('/', (req, res) => {
    res.render('index', {rooms:rooms});
});

io.on('connection', socket => {
    usersOnline++;
    io.sockets.emit('broadcastOnlineUsers', {description: usersOnline + ' users online'});

    /* socket.on('adduser', function (user) {
        socket.username = user;
        console.log(user);
        io.sockets.emit('adduser', user) */
   

    // socket.on('adduser', (user) => {
    //     socket.broadcast.emit('showOnline', 'User is online: ' +user);
    // });
    //})

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
            let room = new Room({
                name: data
            });
            room.save().then(() => {
                console.log('Room saved: ' + room);
            });
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
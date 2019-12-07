var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var ejs = require('ejs');

app.set('views', './views');
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('index');
});

var users = [];
var rooms = [];
var usersOnline = 0;

io.on('connection', socket => {
    usersOnline++;
    io.sockets.emit('broadcastOnlineUsers', {description: usersOnline + ' users online'});

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
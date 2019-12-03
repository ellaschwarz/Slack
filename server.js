const express = require('express');

const app = express()
const server = require('http').Server(app);

const io = require('socket.io')(server);

app.set('views', './views');
app.set('view engine', 'ejs');
app.use(express.static('public'))
app.use(express.urlencoded({extended: true}))

//Tom array eftersom det finns 0 rum i början innan man skapat ett rum
const rooms = {}

app.get('/', (req, res) => {
    res.render('index', {rooms: rooms})
});

/*Route till chattrum som användaren har skapat. Hänvisar till rooms i index.ejs-filen.
Lika med users: {} eftersom vi inte har några users från början.
Kollar sedan så att användaren inte skapar ett rum som redan finns. Skickar då tillbaka användaren till index-sidan.
Skickar sedan användaren till det valda rummet.*/
app.post('/room', (req, res) => {
    if(rooms[req.body.room] != null) {
        return res.redirect('/')
    }
    rooms[req.body.room] = {users: {}}
    res.redirect(req.body.room)
    //Skicka meddelande att ett nytt rum har skapats
    io.emit('room-created', req.body.room)
});

//Route for att komma in i ett chattrum
//Kollar så att rummet existerar, om det inte finns ska användaren redirectas till startsidan.
app.get('/:room', (req, res) => {
    if(rooms[req.params.room] == null) {
        return res.redirect('/')
    }
    res.render('room', {roomName: req.params.room})
});

server.listen(3300);

io.on('connection', socket => {
    socket.on('new-user', (room, name) => {
        //Skickar användaren till chattrum
        socket.join(room)
        rooms[room].users[socket.id] = name
        socket.to(room).broadcast.emit('user-connected', name)
    });

    //Ser till så att meddelandet bara skickas till de i det specifika chatt-rummet.
    socket.on('send-chat-message', (room, message) => {
        socket.to(room).broadcast.emit('chat-message', { 
            message: message, name: rooms[room].users[socket.id] })
    });

    //Meddelar när en användare lämnat servern
    socket.on('disconnect', () => {
        //Funktion som tar bort användaren från alla aktuella rum när hen disconnectat.
        getUserRooms(socket).forEach(room => {
            socket.to(room).broadcast.emit('user-disconnected', rooms[room].users[socket.id])
            delete rooms[room].users[socket.id]
        });
    });
});

/*Funktion som kollar alla våra rum och alla användare. 
Den returnerar sedan alla rum som den användaren finns med i.*/
function getUserRooms(socket) {
    return Object.entries(rooms).reduce((names, [name, room]) => {
        if (room.users[socket.id] != null) names.push(name)
        return names 
    }, [])
}
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create Schema and Model

const MessageSchema = new Schema({
    user: String,
    room: String,
    created_at: {type: Date, default: Date.now()},
    message_body: String,
});


/* const RoomSchema = new Schema({
    name: {type: String, lowercase: true, unique: true},
    topic: String,
    users: [],
    messages: [],
    created_at: Date,
    created_by: String
});

const UserSchema = new Schema({
    username: {type: String, lowercase: true, unique: true},
    email: {type: String, lowercase: true, unique: true},
    password: String
}); */

// Use the method .model('Collection name', Schema) 
const Message = mongoose.model('message', MessageSchema);
/* const Room = mongoose.model('room', RoomSchema);
const User = mongoose.model('user', UserSchema); */

module.exports = Message;
/* module.exports = Room;
module.exports = User; */
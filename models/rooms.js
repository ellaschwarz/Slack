const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RoomSchema = new Schema({
    name: {type: String, lowercase: true, unique: true},
    topic: String,
    users: Array,
    messages: Array,
    created_at: {type: Date, default: Date.now()},
    created_by: String
});

const Room = mongoose.model('Room', RoomSchema);

module.exports = Room;
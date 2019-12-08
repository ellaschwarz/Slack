const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MessageSchema = new Schema({
    user: String,
    room: String,
    created_at: {type: Date, default: Date.now()},
    message_body: String
});

const Message = mongoose.model('Message', MessageSchema);

module.exports = Message;
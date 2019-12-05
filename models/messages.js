const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create Schema and Model

const MessageSchema = new Schema({
    user: String,
    room: String,
    created_at: {type: Date, default: Date.now()},
    message_body: String,
});


// Use the method .model('Collection name', Schema) 
const Message = mongoose.model('message', MessageSchema);


module.exports = Message;

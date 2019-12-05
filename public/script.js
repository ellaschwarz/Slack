const socket = io();

const messageContainer = document.getElementById('message-container');
const roomContainer = document.getElementById('room-container');
const messageForm = document.getElementById('send-container');
const messageInput = document.getElementById('message-input');
const roomName = document.getElementById('room-name').value;



messageForm.addEventListener('submit', e => {
    e.preventDefault();
    appendMessage(`You: ${messageInput.value}`);
    socket.emit('send-chat-message', roomName, messageInput.value);
    messageInput.value = '';
});

socket.on('room-created', room => {
    console.log('Created a room');
    console.log(room);
    const roomElement = document.createElement('div');
    roomElement.innerText = room;
    const roomLink = document.createElement('a');
    roomLink.href = '/${room}';
    roomLink.innerText = 'join';
    roomContainer.append(roomElement);
    roomContainer.append(roomLink);
})


function appendMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.innerText = message;
    messageContainer.append(messageElement);
}
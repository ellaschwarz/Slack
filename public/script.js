const socket = io();

const messageContainer = document.getElementById('message-container');
const roomContainer = document.getElementById('room-container');
const messageForm = document.getElementById('send-container');
const messageInput = document.getElementById('message-input');
const roomName = document.getElementById('room-name');
const roomNameList = document.getElementById('room-name-list');
const userName = document.getElementById('user-name');
const userNameChat = document.getElementById('user-name-chat');
const joinBtn = document.getElementsByClassName('join-btn');

// add event listener on the join buttons
Array.from(joinBtn).forEach(btn => {
    let room = btn.getAttribute('value');
    let user = userNameChat.innerText;
    btn.addEventListener('click', () => {
        socket.emit('enter-room', room, user);
    });
});


messageForm.addEventListener('submit', e => {
    let room = roomName.innerText;
    let user = userName.innerText;
    console.log(userName, roomName);
    e.preventDefault();
    appendMessage(`You: ${messageInput.value}`);
    socket.emit('send-chat-message', room, messageInput.value, user);
    messageInput.value = '';
});

socket.on('chat message', data => {
    appendMessage(`${data.name}: ${data.message}`);
});

socket.on('user-connected', user => {
    // OR Here.................................................
    appendMessage(`${user} connected`)
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
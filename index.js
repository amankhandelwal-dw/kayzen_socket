const http = require('http');
const express = require('express');
const { Server: SocketIO } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        allowedHeaders: ['my-custom-header'],
        credentials: true
    }
});


app.get('/', (req, res) => {
    console.log(io, 'ioioioo')
    return res.send("WebSocket Server is running");
});

io.on("connection", (socket) => {
    console.log('A user connected with socket ID:', socket.id);

    socket.on('disconnect', () => {
        console.log('User disconnected with socket ID:', socket.id);
    });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

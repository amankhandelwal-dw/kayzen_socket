const http = require('http');
const express = require('express');
const { Server: SocketIO } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server, {
    cors: {
        origin: "*",  // Allow all origins (change this for production)
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
        credentials: true
    }
});

app.get('/', (req, res) => {
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

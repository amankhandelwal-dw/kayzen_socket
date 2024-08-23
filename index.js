// /websocket/index.js

const http = require('http');
const express = require('express');
const { Server: SocketIO } = require('socket.io');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
    return res.send("WebSocket Server is running");
});


global.onlineUsers = new Map();

io.on("connection", (socket) => {
    console.log('A user connected');

    const userId = socket.handshake.query.userId;
    if (userId) {
        global.onlineUsers.set(userId, socket.id);
        console.log(global.onlineUsers, 'onlineUsers');
    }

    socket.on('send_notification', async (recipient_id) => {
        const userSocketId = global.onlineUsers.get(recipient_id);
        if (!userSocketId) {
            console.log(`No socket found for recipient_id ${recipient_id}`);
            return;
        }
        try {
            const notifications = await getNotifications(recipient_id);
            io.to(userSocketId).emit('get_notification', { data: notifications });
        } catch (error) {
            console.error('Error sending notifications:', error);
        }
    });

    async function getNotifications(recipient_id) {
        const apiUrl = `http://localhost/kayzen/api/notification/getNotifications/${recipient_id}`;
        try {
            const response = await axios.get(apiUrl);
            return response.data;
        } catch (error) {
            console.error('Error fetching notifications:', error);
            throw error;
        }
    }

    socket.on('disconnect', () => {
        if (userId) {
            global.onlineUsers.delete(userId);
            console.log(global.onlineUsers, 'onlineUsers');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

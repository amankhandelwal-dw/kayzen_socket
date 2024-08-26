const http = require('http');
const express = require('express');
const { Server: SocketIO } = require('socket.io');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server, {
    cors: {
        origin: "http://127.0.0.1:5500",
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
        credentials: true
    }
});

app.use(express.json());

const PORT = process.env.PORT || 5001;

app.get('/', (req, res) => {
    return res.send("WebSocket Server is running");
});

global.onlineUsers = new Map();

io.on("connection", (socket) => {
    console.log('A user connected with socket ID:', socket.id);
    console.log('User ID from query:', socket.handshake.query.userId);

    const userId = socket.handshake.query.userId;
    if (userId) {
        global.onlineUsers.set(userId, socket.id);
    }

    socket.on('send_notification', async (data) => {
        const { recipient_id, recipient_type, notificationId } = data;
        const userSocketId = global.onlineUsers.get(recipient_id);
        if (!userSocketId) {
            console.log(`No socket found for recipient_id ${recipient_id}`);
            return;
        }
        try {
            const notifications = await getNotifications(notificationId);
            io.to(userSocketId).emit('get_notification', { data: notifications });
        } catch (error) {
            console.error('Error sending notifications:', error);
        }
    });

    socket.on('markSeen', async (data) => {
        const { notificationIds, recipient_id } = data;
        const userSocketId = global.onlineUsers.get(recipient_id);
        if (!userSocketId) {
            console.log(`No socket found for recipient_id ${recipient_id}`);
            return;
        }
        try {
            await markNotificationsAsSeen(notificationIds);
            const notifications = await getNotifications(notificationIds[0]); // assuming notificationId can be used to fetch the updated list
            io.to(userSocketId).emit('get_notification', { data: notifications });
        } catch (error) {
            console.error('Error updating and sending notifications:', error);
        }
    });

    async function getNotifications(notificationId) {
        const apiUrl = `https://kayzen.es/backend/api/notification/getNotificationDetails`;
        try {
            const response = await axios.post(apiUrl, { notification_id: notificationId });
            return response.data;
        } catch (error) {
            console.error('Error fetching notifications:', error);
            throw error;
        }
    }
    
    async function markNotificationsAsSeen(notificationIds) {
        const apiUrl = `https://kayzen.es/backend/api/notification/updateNotification`;
        try {
            const formData = new URLSearchParams();
            formData.append('notification_id', notificationIds.join(','));
            const response = await axios.post(apiUrl, formData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error marking notifications as seen:', error);
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

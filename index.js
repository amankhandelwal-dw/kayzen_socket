const http = require('http');
const express = require('express');
const { Server: SocketIO } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new SocketIO(server, {
    cors: {
        origin: "*",
        // methods: ["GET", "POST"],
        // allowedHeaders: ["Content-Type"],
        // credentials: true
    }
});

app.use(express.json());

const PORT = process.env.PORT || 8000;

app.get('/', (req, res) => {
    return res.send("WebSocket Server is running");
});

global.onlineUsers = new Map();

io.on("connection", (socket) => {
    console.log('A user connected with socket ID:', socket.id);
    console.log('User ID from auth:', socket.handshake.auth.userId);
    console.log('User Type from auth:', socket.handshake.auth.userType);
    const userId = socket.handshake.auth.userId;
    const userType = socket.handshake.auth.userType;

    if (userId && userType) {
        global.onlineUsers.set(`${userId}-${userType}`, socket.id);
    }

    socket.on('send_notification', async (data) => {
        const { recipient_id, recipient_type, notificationId } = data;
        const userSocketId = global.onlineUsers.get(`${recipient_id}-${recipient_type}`);
        if (!userSocketId) {
            console.log(`No socket found for recipient_id ${recipient_id} and recipient_type ${recipient_type}`);
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
        const { notificationIds, recipient_id, recipient_type } = data;
        const userSocketId = global.onlineUsers.get(`${recipient_id}-${recipient_type}`);
        if (!userSocketId) {
            console.log(`No socket found for recipient_id ${recipient_id} and recipient_type ${recipient_type}`);
            return;
        }
        try {
            await markNotificationsAsSeen(notificationIds);
            const notifications = await getNotifications(notificationIds[0]);
            io.to(userSocketId).emit('get_notification', { data: notifications });
        } catch (error) {
            console.error('Error updating and sending notifications:', error);
        }
    });

    socket.on('disconnect', () => {
        if (userId && userType) {
            global.onlineUsers.delete(`${userId}-${userType}`);
            console.log('A user disconnected with socket ID:', socket.id);
        }
    });
});

async function getNotifications(notificationId) {
    const apiUrl = `https://kayzen.es/backend/api/notification/getNotificationDetails?notification_id=${notificationId}`;
    console.log(apiUrl, 'apiUrl');
    try {
        const response = await fetch(apiUrl);
        const responseJson = await response.json();
        console.log(responseJson, 'response');
        return responseJson.data;
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
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });
        return await response.json();
    } catch (error) {
        console.error('Error marking notifications as seen:', error);
        throw error;
    }
}

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

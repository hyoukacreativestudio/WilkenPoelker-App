const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

admin.initializeApp({
  credential: admin.credential.cert(process.env.FIREBASE_SERVICE_ACCOUNT)
});

// Routen-Imports (direkt, ohne { router: })
const authRoutes = require('./routes/auth');
const feedRoutes = require('./routes/feed');
const serviceRoutes = require('./routes/service');
const productsRoutes = require('./routes/products');
const notificationsRoutes = require('./routes/notifications');
const usersRoutes = require('./routes/users');

app.use('/api/auth', authRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/service', serviceRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/users', usersRoutes);

// Socket.io für Chats
io.on('connection', (socket) => {
  socket.on('joinChat', (ticketId) => socket.join(ticketId));
  socket.on('message', async (data) => {
    const { ticketId, message, userId } = data;
    const ChatMessage = require('./models/ChatMessage');
    const newMsg = new ChatMessage({ ticketId, message, userId });
    await newMsg.save();
    io.to(ticketId).emit('message', newMsg);
  });
});

// Cron für Taifun-Updates (Platzhalter)
cron.schedule('*/5 * * * *', async () => {
  console.log('Checking Taifun statuses...');
});

server.listen(5000, () => console.log('Server on port 5000'));
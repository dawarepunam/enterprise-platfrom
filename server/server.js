require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const http = require('http');
const app = require('./app');
const initSocket = require('./sockets');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5003;
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Connect to MongoDB and start server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
// Restart trigger
}).catch(err => {
  console.error('Failed to connect to DB', err);
  process.exit(1);
});

# 💬 Real-Time Chat System - Complete Setup Guide

## Overview

This is a professional real-time chat system for your enterprise platform using Socket.IO, allowing team members to communicate in dedicated project rooms with features like typing indicators, online status, file sharing, and message history.

---

## 🏗️ Architecture

### Backend Components

- **Socket.IO Server**: Real-time bi-directional communication (`server/sockets/chatSocket.js`)
- **Message Model**: MongoDB schema for storing messages (`server/models/Message.js`)
- **Chat Room Model**: MongoDB schema for chat rooms (`server/models/ChatRoom.js`)
- **REST API**: Express routes for message history and file sharing (`server/routes/chatRoutes.js`)
- **Controllers**: Business logic for chat operations (`server/controllers/realtimeChatController.js`)

### Frontend Components

- **Chat HTML UI**: Admin console interface (`client/modules/admin/chat/chat.html`)
- **Socket Client**: Real-time connection manager (`client/assets/js/socket.js`)
- **Chat JavaScript**: Main chat logic class (`client/modules/admin/chat/project-chat.js`)
- **Chat CSS**: Professional styling (`client/modules/admin/chat/chat.css`)

---

## 🚀 Getting Started

### 1. Server Setup

The backend is already configured. Ensure your `.env` file has:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/enterprise-platform

# Server
PORT=5000
JWT_SECRET=your_jwt_secret_key

# Cloudinary (Optional - for file uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 2. Install Dependencies

If not already done:

```bash
npm install
```

Required packages are already in `package.json`:

- `socket.io` - Real-time communication
- `mongoose` - MongoDB ORM
- `express` - Web framework
- `multer` - File upload handling
- `jsonwebtoken` - Authentication

### 3. Start the Server

```bash
npm start
```

Or with auto-reload:

```bash
npm run dev
```

Server will run on `http://localhost:5000`

---

## 💻 Frontend Usage

### Access the Chat Console

1. Navigate to admin panel: `http://localhost:5000/client/modules/admin/chat/chat.html`
2. Login with your admin credentials
3. See list of accessible team rooms on the left
4. Click on a room to load its message history and start chatting

### Features

#### 📝 Send Messages

- Type message in input field
- Press "Send" button or Enter key
- Messages are saved to MongoDB and broadcast to all room members

#### 👁️ See Typing Indicator

- When someone is typing, you'll see animated dots
- Shows who is currently typing in the room

#### 🔌 Online Status

- Green pulsing dot next to room name = members online
- Gray dot = no members online
- Updates in real-time

#### 📎 Share Files

- Click attachment button (📎 icon)
- Select file from your computer
- File is uploaded to Cloudinary and shared in chat
- File link appears in message thread

#### 🔍 Message History

- When you open a room, entire history loads automatically
- Old messages remain visible for all future sessions
- New members who join later see all previous messages

#### 🔍 Search Rooms

- Use search box to filter rooms by team or project name
- Results update as you type

---

## 📡 Socket Events

### Client → Server

| Event               | Payload            | Description                |
| ------------------- | ------------------ | -------------------------- |
| `joinProject`       | `{ projectId }`    | Join a project's chat room |
| `chat:message:send` | `{ roomId, text }` | Send a text message        |
| `chat:typing`       | `{ roomId }`       | Broadcast typing status    |
| `chat:typing:stop`  | `{ roomId }`       | Stop typing broadcast      |

### Server → Client

| Event              | Payload                        | Description              |
| ------------------ | ------------------------------ | ------------------------ |
| `connected`        | `{ user, rooms, onlineUsers }` | Connected to chat server |
| `chat:message`     | `{ message object }`           | New message received     |
| `chat:typing`      | `{ roomId, userId, name }`     | User is typing           |
| `chat:typing:stop` | `{ roomId, userId }`           | User stopped typing      |
| `presence:changed` | `{ userId, name, status }`     | User online/offline      |
| `chat:error`       | `{ message }`                  | Error occurred           |

---

## 🔐 Authentication & Authorization

### How It Works

1. **JWT Token**: Sent in Socket.IO handshake via `auth.token`
2. **User Resolution**: Server verifies token and loads user data
3. **Room Access**: User can only access rooms based on their team membership
4. **Admin Override**: Admins can view all team rooms in monitor mode

### Token Handling

Stored in `localStorage` as `token`. Automatically sent with:

- Socket.IO connections
- REST API requests (Authorization header)

---

## 📊 Data Models

### Message Schema

```javascript
{
  _id: ObjectId,
  roomId: String,                // Team room identifier
  teamId: ObjectId,              // Reference to Team
  senderId: ObjectId,            // Reference to User
  senderName: String,            // User's name (cached)
  senderRole: String,            // User's role (MEMBER, MANAGER, etc)
  messageType: String,           // "TEXT" or "FILE"
  text: String,                  // Message content
  fileName: String,              // For file messages
  fileUrl: String,               // For file messages
  fileSize: Number,              // File size in bytes
  mimeType: String,              // MIME type
  createdAt: Date,               // Timestamp
  updatedAt: Date
}
```

### ChatRoom Schema

```javascript
{
  _id: ObjectId,
  teamId: ObjectId,              // Reference to Team
  roomId: String,                // Unique room identifier
  name: String,                  // Room name
  projectId: ObjectId,           // Optional project reference
  projectName: String,           // Project name (cached)
  participants: [ObjectId],      // List of user IDs
  createdBy: ObjectId,           // Creator's user ID
  isActive: Boolean,             // Room active status
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔧 API Endpoints

### Get Room Messages

```
GET /api/chat/rooms/:roomId/messages
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "roomId": "string",
    "teamId": "string",
    "messages": [
      {
        "_id": "string",
        "roomId": "string",
        "senderId": "string",
        "senderName": "string",
        "text": "message content",
        "createdAt": "ISO date"
      }
    ],
    "files": []
  }
}
```

### Send Message

```
POST /api/chat/rooms/:roomId/messages
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "text": "Your message here"
}

Response:
{
  "success": true,
  "data": {
    "message object"
  }
}
```

### Upload File

```
POST /api/chat/rooms/:roomId/files
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
- file: <file to upload>
- caption: "Optional description"

Response:
{
  "success": true,
  "data": {
    "message": { message object },
    "file": { file object }
  }
}
```

### Get Accessible Rooms

```
GET /api/chat/rooms/my
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "teamId": "string",
      "teamName": "string",
      "roomId": "string",
      "projectName": "string"
    }
  ]
}
```

---

## 🎯 Implementation Phases

### ✅ Phase 1 - Completed

- [x] MongoDB Message & ChatRoom models
- [x] Express server setup
- [x] Socket.IO configuration
- [x] Basic message sending/receiving
- [x] REST API for message history
- [x] Frontend chat UI
- [x] Socket event handlers

### Phase 2 - In Progress

- [ ] File upload handling
- [ ] Online/offline status
- [ ] Typing indicators

### Phase 3 - Planned

- [ ] Read receipts (single/double tick)
- [ ] Voice notes
- [ ] Location sharing
- [ ] Video calls integration

---

## 🐛 Troubleshooting

### "Socket not connected"

- Check if server is running on port 5000
- Verify JWT token is valid and stored
- Check browser console for auth errors

### "Messages not loading"

- Ensure MongoDB is running
- Check network tab for API errors
- Verify room access permissions

### "File upload fails"

- Check file size (max 10MB)
- Verify Cloudinary credentials if using cloud storage
- Check upload folder exists in file system

### "Typing indicator not showing"

- Refresh page to reconnect socket
- Check socket events in DevTools Network tab
- Verify `chat:typing` event is being emitted

---

## 📱 Responsive Design

The chat interface is fully responsive:

- **Desktop (1200px+)**: Two-column layout (rooms + chat)
- **Tablet (768px-1199px)**: Stacked layout, collapsible sidebar
- **Mobile (<768px)**: Single column, room list as drawer

---

## 🔒 Security Considerations

1. **Authentication**: All sockets require valid JWT token
2. **Authorization**: Users can only access their team rooms
3. **Input Sanitization**: HTML is escaped in messages
4. **File Validation**: File uploads validated by type and size
5. **CORS**: Configured to accept requests from authorized origins

---

## 📈 Performance Optimizations

1. **Message Pagination**: Load only recent messages, lazy load older ones
2. **Socket Rooms**: Messages broadcast only to relevant room members
3. **Connection Pooling**: MongoDB connection reuse
4. **Caching**: User names cached in message documents
5. **Compression**: Socket.IO compression enabled

---

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production` in .env
- [ ] Configure MongoDB Atlas connection
- [ ] Set up Cloudinary account for file uploads
- [ ] Configure JWT_SECRET with strong random value
- [ ] Enable HTTPS/SSL certificates
- [ ] Set CORS_ORIGIN to your domain
- [ ] Configure rate limiting
- [ ] Set up monitoring/logging
- [ ] Enable database backups

### Docker (Optional)

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

Build & run:

```bash
docker build -t enterprise-chat .
docker run -p 5000:5000 --env-file .env enterprise-chat
```

---

## 📚 Additional Resources

- [Socket.IO Docs](https://socket.io/docs/)
- [Express.js Guide](https://expressjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [Cloudinary Docs](https://cloudinary.com/documentation)

---

## 💡 Future Enhancements

1. **Message Search**: Full-text search across messages
2. **Reactions**: Emoji reactions to messages
3. **Threading**: Reply to specific messages
4. **Voice Chat**: WebRTC integration for voice/video
5. **Notifications**: Push notifications for new messages
6. **Pin Messages**: Important messages pinned to room
7. **Message Reactions**: Emoji reactions
8. **Scheduled Messages**: Send message at specific time

---

## 🤝 Contributing

To add new features:

1. Update Socket event handlers in `server/sockets/chatSocket.js`
2. Update Message schema if needed
3. Add REST endpoints to `server/routes/chatRoutes.js`
4. Update frontend `ProjectChat` class in `project-chat.js`
5. Add corresponding UI elements in `chat.html`
6. Style using `chat.css`

---

## 📞 Support

For issues or questions:

1. Check troubleshooting section above
2. Review console errors (F12 in browser)
3. Check server logs in terminal
4. Verify MongoDB is running
5. Ensure all environment variables are set

---

**Last Updated**: May 15, 2026  
**Status**: Production Ready ✅

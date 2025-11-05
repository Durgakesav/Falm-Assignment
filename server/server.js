const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createRoomsManager } = require('./rooms');

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Serve static client
app.use(express.static(path.join(__dirname, '..', 'client')));

const rooms = createRoomsManager();

io.on('connection', (socket) => {
  const query = socket.handshake.query || {};
  const roomId = (query.room && String(query.room)) || 'lobby';

  const user = rooms.addUserToRoom(roomId, socket);

  // Send initial state to the new user
  socket.emit('init', rooms.getInitialPayload(roomId, user.userId));

  // Notify others
  socket.to(roomId).emit('user:joined', { user });
  io.to(roomId).emit('users:list', rooms.getUsersPublic(roomId));

  // Cursor broadcast
  socket.on('cursor', (payload) => {
    socket.to(roomId).emit('cursor', { userId: user.userId, ...payload });
  });

  // Stroke lifecycle: start/point/end
  socket.on('stroke:start', (payload) => {
    const startEvent = rooms.startStroke(roomId, user.userId, payload);
    // broadcast live start
    socket.to(roomId).emit('stroke:start', startEvent);
  });

  socket.on('stroke:point', (payload) => {
    const pointEvent = rooms.addStrokePoint(roomId, user.userId, payload);
    if (pointEvent) {
      socket.to(roomId).emit('stroke:point', pointEvent);
    }
  });

  socket.on('stroke:end', () => {
    const commit = rooms.endStroke(roomId, user.userId);
    if (commit) {
      // Broadcast final committed operation
      io.to(roomId).emit('op:commit', commit);
      // Also refresh users list in case tool/color changed on commit
      io.to(roomId).emit('users:list', rooms.getUsersPublic(roomId));
    }
  });

  // Shapes
  socket.on('shape:rect', (payload) => {
    const op = rooms.commitRect(roomId, user.userId, payload);
    if (op) io.to(roomId).emit('op:commit', op);
  });
  socket.on('shape:line', (payload) => {
    const op = rooms.commitLine(roomId, user.userId, payload);
    if (op) io.to(roomId).emit('op:commit', op);
  });
  socket.on('shape:ellipse', (payload) => {
    const op = rooms.commitEllipse(roomId, user.userId, payload);
    if (op) io.to(roomId).emit('op:commit', op);
  });

  // Tool/color/width updates (for other clients to display indicators)
  socket.on('tool:update', (payload) => {
    rooms.updateUserTool(roomId, user.userId, payload);
    socket.to(roomId).emit('user:tool', { userId: user.userId, ...payload });
    io.to(roomId).emit('users:list', rooms.getUsersPublic(roomId));
  });

  // Global undo/redo
  socket.on('op:undo', () => {
    const revert = rooms.undo(roomId);
    if (revert) io.to(roomId).emit('op:revert', revert);
  });

  socket.on('op:redo', () => {
    const reapply = rooms.redo(roomId);
    if (reapply) io.to(roomId).emit('op:commit', reapply);
  });

  // Replace state (session load)
  socket.on('state:replace', (ops) => {
    if (!Array.isArray(ops)) return;
    const newOps = rooms.replaceState(roomId, ops);
    io.to(roomId).emit('state:reset', newOps);
  });

  // latency probe
  socket.on('ping', (t0) => {
    socket.emit('pong', t0);
  });

  socket.on('disconnect', () => {
    rooms.removeUserFromRoom(roomId, user.userId);
    socket.to(roomId).emit('user:left', { userId: user.userId });
    io.to(roomId).emit('users:list', rooms.getUsersPublic(roomId));
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${PORT}`);
});



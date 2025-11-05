const { createDrawingState } = require('./drawing-state');

function generateId(length = 10) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let id = '';
  for (let i = 0; i < length; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

const COLOR_PALETTE = [
  '#e53935', '#d81b60', '#8e24aa', '#5e35b1', '#3949ab', '#1e88e5', '#039be5', '#00acc1', '#00897b', '#43a047',
  '#7cb342', '#c0ca33', '#fdd835', '#ffb300', '#fb8c00', '#f4511e', '#6d4c41', '#757575', '#546e7a'
];

function createRoomsManager() {
  const rooms = new Map(); // roomId -> { users: Map, drawing: DrawingState }

  function ensureRoom(roomId) {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: new Map(), // userId -> { userId, name, color, width, tool, socketId }
        drawing: createDrawingState()
      });
    }
    return rooms.get(roomId);
  }

  function addUserToRoom(roomId, socket) {
    const room = ensureRoom(roomId);
    socket.join(roomId);
    const userId = generateId(8);
    const color = COLOR_PALETTE[(room.users.size) % COLOR_PALETTE.length];
    const user = {
      userId,
      name: `User-${userId}`,
      color,
      width: 4,
      tool: 'brush',
      socketId: socket.id
    };
    room.users.set(userId, user);
    return user;
  }

  function removeUserFromRoom(roomId, userId) {
    const room = ensureRoom(roomId);
    room.users.delete(userId);
    // If user had an active stroke, finalize nothing and drop it
    room.drawing.cancelActiveStroke(userId);
  }

  function updateUserTool(roomId, userId, payload) {
    const room = ensureRoom(roomId);
    const user = room.users.get(userId);
    if (!user) return;
    if (typeof payload.color === 'string') user.color = payload.color;
    if (typeof payload.width === 'number') user.width = payload.width;
    if (typeof payload.tool === 'string') user.tool = payload.tool;
  }

  function getUsersPublic(roomId) {
    const room = ensureRoom(roomId);
    return Array.from(room.users.values()).map(u => ({
      userId: u.userId,
      name: u.name,
      color: u.color,
      width: u.width,
      tool: u.tool
    }));
  }

  function startStroke(roomId, userId, payload) {
    const room = ensureRoom(roomId);
    const user = room.users.get(userId);
    if (!user) return null;
    const { x, y, width, color, tool } = payload;
    const mode = (tool === 'eraser') ? 'erase' : 'draw';
    const widthToUse = typeof width === 'number' ? width : user.width;
    const colorToUse = typeof color === 'string' ? color : user.color;
    // track active stroke
    room.drawing.startActiveStroke(userId, {
      id: generateId(10),
      type: 'stroke',
      mode,
      color: colorToUse,
      width: widthToUse,
      userId,
      points: [{ x, y, t: Date.now() }],
      ts: Date.now()
    });
    return { userId, x, y, width: widthToUse, color: colorToUse, mode };
  }

  function addStrokePoint(roomId, userId, payload) {
    const room = ensureRoom(roomId);
    const stroke = room.drawing.addPointToActiveStroke(userId, {
      x: payload.x,
      y: payload.y,
      t: Date.now()
    });
    if (!stroke) return null;
    return { userId, x: payload.x, y: payload.y };
  }

  function endStroke(roomId, userId) {
    const room = ensureRoom(roomId);
    const op = room.drawing.commitActiveStroke(userId);
    if (!op) return null;
    return op; // broadcast as op:commit
  }

  function commitRect(roomId, userId, payload) {
    const room = ensureRoom(roomId);
    const op = {
      id: generateId(10),
      type: 'rect',
      mode: payload.mode === 'erase' ? 'erase' : 'draw',
      color: typeof payload.color === 'string' ? payload.color : '#000',
      width: typeof payload.width === 'number' ? payload.width : 2,
      userId,
      x: payload.x,
      y: payload.y,
      w: payload.w,
      h: payload.h,
      ts: Date.now()
    };
    const committed = room.drawing.commitOp(op);
    return committed;
  }

  function commitLine(roomId, userId, payload) {
    const room = ensureRoom(roomId);
    const op = {
      id: generateId(10),
      type: 'line',
      mode: payload.mode === 'erase' ? 'erase' : 'draw',
      color: typeof payload.color === 'string' ? payload.color : '#000',
      width: typeof payload.width === 'number' ? payload.width : 2,
      userId,
      x1: payload.x1, y1: payload.y1, x2: payload.x2, y2: payload.y2,
      ts: Date.now()
    };
    return room.drawing.commitOp(op);
  }

  function commitEllipse(roomId, userId, payload) {
    const room = ensureRoom(roomId);
    const op = {
      id: generateId(10),
      type: 'ellipse',
      mode: payload.mode === 'erase' ? 'erase' : 'draw',
      color: typeof payload.color === 'string' ? payload.color : '#000',
      width: typeof payload.width === 'number' ? payload.width : 2,
      userId,
      x: payload.x, y: payload.y, w: payload.w, h: payload.h,
      ts: Date.now()
    };
    return room.drawing.commitOp(op);
  }

  function undo(roomId) {
    const room = ensureRoom(roomId);
    return room.drawing.undo();
  }

  function redo(roomId) {
    const room = ensureRoom(roomId);
    return room.drawing.redo();
  }

  function replaceState(roomId, ops) {
    const room = ensureRoom(roomId);
    // sanitize ops (only allow known shapes and fields)
    const safe = [];
    for (const o of ops) {
      if (!o || (o.type !== 'stroke' && o.type !== 'rect')) continue;
      if (o.type === 'stroke' && Array.isArray(o.points)) {
        safe.push({
          id: typeof o.id === 'string' ? o.id : generateId(10),
          type: 'stroke',
          mode: o.mode === 'erase' ? 'erase' : 'draw',
          color: typeof o.color === 'string' ? o.color : '#000',
          width: typeof o.width === 'number' ? o.width : 2,
          userId: typeof o.userId === 'string' ? o.userId : 'import',
          points: o.points.map(p => ({ x: +p.x, y: +p.y, t: +p.t || Date.now() })),
          ts: +o.ts || Date.now()
        });
      } else if (o.type === 'rect') {
        safe.push({
          id: typeof o.id === 'string' ? o.id : generateId(10),
          type: 'rect',
          mode: o.mode === 'erase' ? 'erase' : 'draw',
          color: typeof o.color === 'string' ? o.color : '#000',
          width: typeof o.width === 'number' ? o.width : 2,
          userId: typeof o.userId === 'string' ? o.userId : 'import',
          x: +o.x, y: +o.y, w: +o.w, h: +o.h,
          ts: +o.ts || Date.now()
        });
      }
    }
    room.drawing.replaceCommittedOps(safe);
    return room.drawing.getCommittedOps();
  }

  function getInitialPayload(roomId, requesterId) {
    const room = ensureRoom(roomId);
    return {
      roomId,
      you: room.users.get(requesterId),
      users: getUsersPublic(roomId),
      ops: room.drawing.getCommittedOps(),
      active: room.drawing.getActiveStrokesPublic()
    };
  }

  return {
    addUserToRoom,
    removeUserFromRoom,
    updateUserTool,
    getUsersPublic,
    startStroke,
    addStrokePoint,
    endStroke,
    commitRect,
    commitLine,
    commitEllipse,
    undo,
    redo,
    replaceState,
    getInitialPayload
  };
}

module.exports = { createRoomsManager };



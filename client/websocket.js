(function() {
  const ws = {
    socket: null,
    lastSendAt: 0,
    throttleMs: 12,
    connect(roomId) {
      const urlParams = new URLSearchParams(window.location.search);
      const room = roomId || urlParams.get('room') || 'lobby';
      this.socket = io({ query: { room } });

      this.socket.on('connect', () => {
        ws._ping();
      });

      this.socket.on('init', (payload) => {
        const { ops, users, active } = payload;
        // replace local ops with server snapshot
        window.App.canvas.committedOps.length = 0;
        for (const op of ops) window.App.canvas.committedOps.push(op);
        window.App.canvas.redrawAll();
        window.App.canvas.setUsersList(users);
        for (const a of active) {
          window.App.canvas.onRemoteStart({
            userId: a.userId, x: a.head.x, y: a.head.y, width: a.width, color: a.color, mode: a.mode
          });
        }
      });

      this.socket.on('users:list', (users) => window.App.canvas.setUsersList(users));
      this.socket.on('user:left', ({ userId }) => window.App.canvas.removeCursor(userId));
      this.socket.on('user:joined', ({ user }) => void user);

      this.socket.on('cursor', ({ userId, x, y }) => window.App.canvas.moveCursor(userId, x, y));
      this.socket.on('stroke:start', (ev) => window.App.canvas.onRemoteStart(ev));
      this.socket.on('stroke:point', (ev) => window.App.canvas.onRemotePoint(ev));
      this.socket.on('op:commit', (op) => window.App.canvas.onOpCommit(op));
      this.socket.on('op:revert', (rev) => window.App.canvas.onOpRevert(rev));
      this.socket.on('state:reset', (ops) => {
        window.App.canvas.committedOps.length = 0;
        for (const op of ops) window.App.canvas.committedOps.push(op);
        window.App.canvas.redrawAll();
      });

      this.socket.on('pong', (t0) => {
        const rtt = Math.max(0, Date.now() - t0);
        const el = document.getElementById('latency');
        if (el) el.textContent = `RTT: ${rtt}ms`;
        setTimeout(() => ws._ping(), 2000);
      });
    },
    _ping() { if (this.socket) this.socket.emit('ping', Date.now()); },
    send(event, payload) { if (this.socket) this.socket.emit(event, payload); },
    sendThrottled(event, payload) {
      const now = performance.now();
      if ((now - this.lastSendAt) >= this.throttleMs) {
        this.lastSendAt = now;
        this.send(event, payload);
      }
    }
  };

  window.App = window.App || {};
  window.App.ws = ws;
})();



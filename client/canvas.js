(function() {
  const devicePixelRatioSafe = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

  const state = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    tool: 'brush',
    color: '#3949ab',
    widthPx: 4,
    drawing: false,
    localPoints: [],
    committedOps: [],
    previewRect: null,
    previewLine: null,
    previewEllipse: null,
    cursors: new Map(),
    lastFrameTime: performance.now(),
    fps: 0
  };

  function setupCanvas(canvas) {
    state.canvas = canvas;
    state.ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  function resizeCanvas() {
    const rect = state.canvas.getBoundingClientRect();
    state.width = Math.floor(rect.width);
    state.height = Math.floor(rect.height);
    const scale = devicePixelRatioSafe;
    state.canvas.width = state.width * scale;
    state.canvas.height = state.height * scale;
    state.ctx.setTransform(scale, 0, 0, scale, 0, 0);
    redrawAll();
  }

  function setTool(tool) {
    state.tool = tool;
  }

  function setColor(color) {
    state.color = color;
  }

  function setWidth(px) {
    state.widthPx = px;
  }

  function screenToCanvas(evt) {
    const rect = state.canvas.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  }

  function beginStroke(point) {
    state.drawing = true;
    state.localPoints = [point];
    window.App.ws.send('stroke:start', { x: point.x, y: point.y, color: state.color, width: state.widthPx, tool: state.tool });
  }

  function appendPoint(point) {
    if (!state.drawing) return;
    state.localPoints.push(point);
    drawSegment(state.localPoints, state.tool, state.color, state.widthPx, true);
    window.App.ws.sendThrottled('stroke:point', { x: point.x, y: point.y });
  }

  function endStroke() {
    if (!state.drawing) return;
    state.drawing = false;
    state.localPoints.length = 0;
    window.App.ws.send('stroke:end');
  }

  // Rectangle drawing helpers
  function beginRect(point) {
    state.previewRect = { x: point.x, y: point.y, w: 0, h: 0, color: state.color, width: state.widthPx, mode: state.tool === 'eraser' ? 'erase' : 'draw' };
    redrawAll();
    drawRect(state.previewRect, true);
  }
  function updateRect(point) {
    if (!state.previewRect) return;
    const r = state.previewRect;
    r.w = point.x - r.x;
    r.h = point.y - r.y;
    redrawAll();
    drawRect(r, true);
  }
  function commitRect() {
    if (!state.previewRect) return;
    const r = state.previewRect;
    state.previewRect = null;
    window.App.ws.send('shape:rect', { x: r.x, y: r.y, w: r.w, h: r.h, color: r.color, width: r.width, mode: r.mode });
  }

  // Line
  function beginLine(point) {
    state.previewLine = { x1: point.x, y1: point.y, x2: point.x, y2: point.y, color: state.color, width: state.widthPx, mode: state.tool === 'eraser' ? 'erase' : 'draw' };
    redrawAll();
    drawLine(state.previewLine, true);
  }
  function updateLine(point) {
    if (!state.previewLine) return;
    state.previewLine.x2 = point.x; state.previewLine.y2 = point.y;
    redrawAll();
    drawLine(state.previewLine, true);
  }
  function commitLine() {
    if (!state.previewLine) return;
    const l = state.previewLine; state.previewLine = null;
    window.App.ws.send('shape:line', { x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2, color: l.color, width: l.width, mode: l.mode });
  }

  // Ellipse
  function beginEllipse(point) {
    state.previewEllipse = { x: point.x, y: point.y, w: 0, h: 0, color: state.color, width: state.widthPx, mode: state.tool === 'eraser' ? 'erase' : 'draw' };
    redrawAll();
    drawEllipse(state.previewEllipse, true);
  }
  function updateEllipse(point) {
    if (!state.previewEllipse) return;
    const e = state.previewEllipse; e.w = point.x - e.x; e.h = point.y - e.y;
    redrawAll();
    drawEllipse(e, true);
  }
  function commitEllipse() {
    if (!state.previewEllipse) return;
    const e = state.previewEllipse; state.previewEllipse = null;
    window.App.ws.send('shape:ellipse', { x: e.x, y: e.y, w: e.w, h: e.h, color: e.color, width: e.width, mode: e.mode });
  }

  function drawSegment(points, tool, color, width, onlyLatest) {
    const ctx = state.ctx;
    const mode = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    const startIndex = onlyLatest ? Math.max(0, points.length - 3) : 0;
    ctx.beginPath();
    for (let i = startIndex; i < points.length; i++) {
      const p = points[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else {
        const prev = points[i - 1];
        const midX = (prev.x + p.x) / 2;
        const midY = (prev.y + p.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawRect(rect, isPreview) {
    const { x, y, w, h, color, width, mode } = rect;
    const ctx = state.ctx;
    ctx.save();
    ctx.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over';
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.lineJoin = 'miter';
    ctx.setLineDash(isPreview ? [8, 6] : []);
    const rx = w >= 0 ? x : x + w;
    const ry = h >= 0 ? y : y + h;
    const rw = Math.abs(w);
    const rh = Math.abs(h);
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.restore();
  }

  function drawLine(line, isPreview) {
    const { x1, y1, x2, y2, color, width, mode } = line;
    const ctx = state.ctx; ctx.save();
    ctx.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over';
    ctx.lineWidth = width; ctx.strokeStyle = color; ctx.lineCap = 'round';
    ctx.setLineDash(isPreview ? [8,6] : []);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
  }

  function drawEllipse(ell, isPreview) {
    const { x, y, w, h, color, width, mode } = ell;
    const ctx = state.ctx; ctx.save();
    ctx.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over';
    ctx.lineWidth = width; ctx.strokeStyle = color; ctx.setLineDash(isPreview ? [8,6] : []);
    const rx = w >= 0 ? x : x + w; const ry = h >= 0 ? y : y + h; const rw = Math.abs(w); const rh = Math.abs(h);
    const cx = rx + rw / 2; const cy = ry + rh / 2; const rxA = rw / 2; const ryA = rh / 2;
    ctx.beginPath(); ctx.ellipse(cx, cy, rxA, ryA, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }

  function redrawAll() {
    const ctx = state.ctx;
    ctx.clearRect(0, 0, state.width, state.height);
    for (const op of state.committedOps) {
      if (op.type === 'stroke') {
        drawSegment(op.points, op.mode === 'erase' ? 'eraser' : 'brush', op.color, op.width, false);
      } else if (op.type === 'rect') {
        drawRect(op, false);
      } else if (op.type === 'line') {
        drawLine(op, false);
      } else if (op.type === 'ellipse') {
        drawEllipse(op, false);
      }
    }
    if (state.previewRect) drawRect(state.previewRect, true);
    if (state.previewLine) drawLine(state.previewLine, true);
    if (state.previewEllipse) drawEllipse(state.previewEllipse, true);
  }

  // Remote live updates
  function onRemoteStart({ userId, x, y, width, color, mode }) {
    const cursor = ensureCursor(userId, width, color);
    moveCursor(userId, x, y);
    cursor.points = [{ x, y }];
    cursor.tool = mode === 'erase' ? 'eraser' : 'brush';
    cursor.color = color;
    cursor.width = width;
  }

  function onRemotePoint({ userId, x, y }) {
    const cursor = state.cursors.get(userId);
    if (!cursor || !cursor.points) return;
    cursor.points.push({ x, y });
    drawSegment(cursor.points, cursor.tool, cursor.color, cursor.width, true);
    moveCursor(userId, x, y);
  }

  function onOpCommit(op) {
    // finalize remote/local op
    state.committedOps.push(op);
    // redraw just the op tail (already drawn live), conservative approach: do nothing
    // full redraw if many ops undone/redone
    if (state.committedOps.length % 50 === 0) redrawAll();
  }

  function onOpRevert(revert) {
    const idx = state.committedOps.findIndex(o => o.id === revert.opId);
    if (idx >= 0) {
      state.committedOps.splice(idx, 1);
      redrawAll();
    }
  }

  function ensureCursor(userId, width, color) {
    let el = state.cursors.get(userId);
    if (!el) {
      el = document.createElement('div');
      el.className = 'cursor';
      el.style.width = `${width}px`;
      el.style.height = `${width}px`;
      el.style.borderColor = 'rgba(0,0,0,0.2)';
      el.style.boxShadow = `0 0 0 2px ${color} inset`;
      document.querySelector('.stage').appendChild(el);
      state.cursors.set(userId, el);
    }
    return el;
  }

  function moveCursor(userId, x, y) {
    const el = ensureCursor(userId, state.widthPx, state.color);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }

  function removeCursor(userId) {
    const el = state.cursors.get(userId);
    if (el && el.parentNode) el.parentNode.removeChild(el);
    state.cursors.delete(userId);
  }

  function setUsersList(users) {
    const ul = document.getElementById('users');
    ul.innerHTML = '';
    for (const u of users) {
      const li = document.createElement('li');
      const sw = document.createElement('span');
      sw.className = 'swatch';
      sw.style.background = u.color;
      const label = document.createElement('span');
      label.textContent = `${u.name} (${u.tool}, ${u.width}px)`;
      li.appendChild(sw);
      li.appendChild(label);
      ul.appendChild(li);
    }
  }

  // Perf metrics
  function tickFPS() {
    const now = performance.now();
    const dt = now - state.lastFrameTime;
    state.lastFrameTime = now;
    state.fps = Math.round(1000 / Math.max(1, dt));
    document.getElementById('fps').textContent = `FPS: ${state.fps}`;
    requestAnimationFrame(tickFPS);
  }
  requestAnimationFrame(tickFPS);

  window.App = window.App || {};
  window.App.canvas = {
    setupCanvas,
    setTool,
    setColor,
    setWidth,
    screenToCanvas,
    beginStroke,
    appendPoint,
    endStroke,
    beginRect,
    updateRect,
    commitRect,
    beginLine,
    updateLine,
    commitLine,
    beginEllipse,
    updateEllipse,
    commitEllipse,
    onRemoteStart,
    onRemotePoint,
    onOpCommit,
    onOpRevert,
    setUsersList,
    moveCursor,
    removeCursor,
    redrawAll,
    committedOps: state.committedOps
  };
})();



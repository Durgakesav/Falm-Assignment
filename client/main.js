(function() {
  const canvasEl = document.getElementById('canvas');
  const stageEl = document.querySelector('.stage');
  const toolBrush = document.getElementById('tool-brush');
  const toolEraser = document.getElementById('tool-eraser');
  const toolRect = document.getElementById('tool-rect');
  const toolLine = document.getElementById('tool-line');
  const toolEllipse = document.getElementById('tool-ellipse');
  const colorEl = document.getElementById('color');
  const widthEl = document.getElementById('width');
  const undoEl = document.getElementById('undo');
  const redoEl = document.getElementById('redo');
  const saveEl = document.getElementById('save');
  const loadEl = document.getElementById('load');
  const loadFileEl = document.getElementById('load-file');

  window.App.canvas.setupCanvas(canvasEl);
  window.App.ws.connect();

  function setTool(tool) {
    window.App.canvas.setTool(tool);
    window.App.ws.send('tool:update', { tool });
    toolBrush.classList.toggle('active', tool === 'brush');
    toolEraser.classList.toggle('active', tool === 'eraser');
    toolRect.classList.toggle('active', tool === 'rect');
    toolLine.classList.toggle('active', tool === 'line');
    toolEllipse.classList.toggle('active', tool === 'ellipse');
  }

  toolBrush.addEventListener('click', () => setTool('brush'));
  toolEraser.addEventListener('click', () => setTool('eraser'));
  toolRect.addEventListener('click', () => setTool('rect'));
  toolLine.addEventListener('click', () => setTool('line'));
  toolEllipse.addEventListener('click', () => setTool('ellipse'));

  colorEl.addEventListener('input', (e) => {
    const color = e.target.value;
    window.App.canvas.setColor(color);
    window.App.ws.send('tool:update', { color });
  });

  widthEl.addEventListener('input', (e) => {
    const w = Number(e.target.value);
    window.App.canvas.setWidth(w);
    window.App.ws.send('tool:update', { width: w });
  });

  undoEl.addEventListener('click', () => window.App.ws.send('op:undo'));
  redoEl.addEventListener('click', () => window.App.ws.send('op:redo'));

  function onPointerDown(e) {
    const p = window.App.canvas.screenToCanvas(e);
    let current = 'brush';
    if (toolRect.classList.contains('active')) current = 'rect';
    else if (toolLine.classList.contains('active')) current = 'line';
    else if (toolEllipse.classList.contains('active')) current = 'ellipse';
    else if (toolEraser.classList.contains('active')) current = 'eraser';
    if (current === 'rect') window.App.canvas.beginRect(p);
    else if (current === 'line') window.App.canvas.beginLine(p);
    else if (current === 'ellipse') window.App.canvas.beginEllipse(p);
    else window.App.canvas.beginStroke(p);
  }
  function onPointerMove(e) {
    const p = window.App.canvas.screenToCanvas(e);
    if (toolRect.classList.contains('active')) window.App.canvas.updateRect(p);
    else if (toolLine.classList.contains('active')) window.App.canvas.updateLine(p);
    else if (toolEllipse.classList.contains('active')) window.App.canvas.updateEllipse(p);
    else window.App.canvas.appendPoint(p);
    window.App.ws.sendThrottled('cursor', { x: p.x, y: p.y });
  }
  function onPointerUp() {
    if (toolRect.classList.contains('active')) window.App.canvas.commitRect();
    else if (toolLine.classList.contains('active')) window.App.canvas.commitLine();
    else if (toolEllipse.classList.contains('active')) window.App.canvas.commitEllipse();
    else window.App.canvas.endStroke();
  }

  // Mouse
  canvasEl.addEventListener('mousedown', (e) => { e.preventDefault(); onPointerDown(e); });
  window.addEventListener('mousemove', (e) => onPointerMove(e));
  window.addEventListener('mouseup', () => onPointerUp());

  // Touch
  canvasEl.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    onPointerDown(t);
  }, { passive: false });
  window.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (t) onPointerMove(t);
  }, { passive: true });
  window.addEventListener('touchend', () => onPointerUp());

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); window.App.ws.send('op:undo'); }
    if (((e.ctrlKey || e.metaKey) && (e.shiftKey && e.key.toLowerCase() === 'z')) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y')) { e.preventDefault(); window.App.ws.send('op:redo'); }
  });

  // Save/Load
  saveEl.addEventListener('click', () => {
    const data = JSON.stringify(window.App.canvas.committedOps, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'canvas-session.json'; a.click();
    URL.revokeObjectURL(url);
  });
  loadEl.addEventListener('click', () => loadFileEl.click());
  loadFileEl.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const ops = JSON.parse(text);
      window.App.ws.send('state:replace', ops);
    } catch (_) {}
    loadFileEl.value = '';
  });
})();



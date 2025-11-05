# Collaborative Canvas – User Guide

## Getting Started

1. In terminal:
   - `npm install`
   - `npm start`
2. Open your browser at `http://localhost:3000`
3. To test with multiple users, open a second tab/window to the same URL.
4. Optional rooms: add `?room=any-name`, e.g. `http://localhost:3000?room=demo`

## Drawing Tools

- Brush: click “Brush”, then click and drag on the canvas to draw.
- Eraser: click “Eraser” to erase existing pixels (uses the width slider size).
- Rectangle: click “Rect”, then click-drag to size; release to commit the rectangle.
- Color: choose a color; applies to Brush and Rect.
- Width: set stroke thickness (also eraser/rect border thickness).

## Collaboration

- Live cursors: see other users’ cursors move around the canvas.
- Real-time strokes: drawings stream while users draw (no waiting for finish).
- User list: shows who’s online, their color, tool, and width.

## Undo / Redo (Global)

- Buttons: click “Undo” and “Redo”.
- Shortcuts:
  - Undo: Ctrl/Cmd + Z
  - Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
- Global behavior: affects the entire room for all users.

## Save / Load Sessions

- Save: click “Save” to download a JSON file of the current session.
- Load: click “Load” and choose a previously saved JSON to replace the room state (everyone in the room sees it).

## Tips

- Use rooms to separate groups or activities.
- Resize window to fit your screen; the canvas replays content automatically.
- If lines look jagged, slow down pointer movement slightly; the app smooths paths with curves.

## Troubleshooting

- Nothing happens when drawing:
  - Reload the page (Ctrl+R).
  - Ensure the server is running (terminal shows “Server listening on http://localhost:3000”).
- No real-time updates:
  - Open `http://localhost:3000/socket.io/socket.io.js` in the browser; it should load.
  - Check VPN/firewall settings.
- High latency or choppiness:
  - Close heavy tabs/apps; keep only needed tabs open.
  - Try a different browser.

## Supported Browsers

- Latest Chrome, Edge, Firefox, and Safari.

# Collaborative Canvas – User Guide

## Getting Started

1. Start the app:
   - In terminal: `npm install` then `npm start`
   - Open your browser at `http://localhost:3000`
2. To test with multiple users, open a second tab or window to the same URL.
3. Optional rooms: add `?room=any-name`, e.g. `http://localhost:3000?room=demo`

## Drawing Tools

- Brush: click “Brush”, then click and drag on the canvas to draw.
- Eraser: click “Eraser” to remove parts of drawings (uses the slider size).
- Rectangle: click “Rect”, click-drag to size, release to commit.
- Color: use the color picker to set brush/rectangle color.
- Width: use the slider to set stroke/eraser/rectangle border width.

## Real-time Collaboration

- Cursors: you’ll see other users’ cursors moving as they draw.
- Live drawing: strokes stream in real-time while others draw.
- User list: shows who’s online with their assigned color and tool/width.

## Undo/Redo (Global)

- Buttons: use “Undo” and “Redo”.
- Keyboard shortcuts:
  - Undo: Ctrl/Cmd + Z
  - Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
- Undo/redo affects the whole room (all users see the change).

## Save/Load Sessions

- Save: click “Save” to download a JSON file of the current canvas operations.
- Load: click “Load” and choose a previously saved JSON; the room state is replaced for everyone.

## Tips

- For best performance, keep one tab per user on the same machine.
- Use rooms to separate groups or sessions.
- Resize the window to reflow the canvas; content will be replayed.

## Troubleshooting

- Page doesn’t load drawings or tools:
  - Refresh the page (Ctrl+R).
  - Ensure the server is running in the terminal (`npm start`).
- Can’t connect or no real-time updates:
  - Check firewall/VPN.
  - Verify `http://localhost:3000/socket.io/socket.io.js` loads in the browser.
- High latency or choppy lines:
  - Close other heavy apps/tabs.
  - Try a different browser.

## Supported Browsers

- Latest Chrome, Edge, Firefox, and Safari.



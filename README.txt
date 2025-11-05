# Collaborative Canvas (Vanilla JS + Node + Socket.IO)

A real-time multi-user drawing canvas with brush/eraser, colors, stroke width, live cursors, global undo/redo, and user list.

## Setup

- Requirements: Node 18+
- Install: `npm install`
- Run: `npm start`
- Dev (auto-restart): `npm run dev`
- Open: `http://localhost:3000`

Open two or more browser windows to test collaboration. Optional room support via `?room=roomId`, e.g. `http://localhost:3000?room=demo`.

## Features

- Drawing tools: brush, eraser, color picker, width slider
- Real-time sync: live streaming of stroke points and cursor positions
- User indicators: live cursors with user-assigned colors; online user list
- Global undo/redo: operates on server-maintained operation log
- Basic conflict handling: server-ordered operations ensure consistent state
- Performance: requestAnimationFrame rendering, throttled network sends
- Mobile touch support

## Known Limitations

- Redraw replays operations on resize; no offscreen tile cache yet
- Eraser uses compositing; no vector-level boolean ops
- No persistence to storage; state resets on server restart
- Undo/redo operates on committed strokes, not partial segments

## Testing Multi-User

- Open two tabs: `http://localhost:3000`
- Draw in one; see live drawing in the other
- Try undo/redo; both canvases stay in sync
- Change color/width/tool and observe user list updates

## Time Spent

- Initial implementation: ~4-5 hours
- Docs and polish: ~1 hour

## License

MIT



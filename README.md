# Collaborative Canvas (Vanilla JS + Node + Socket.IO)

A **real-time multi-user drawing canvas** with brush/eraser, colors, stroke width, live cursors, global undo/redo, and user list.

---

## Features

- **Drawing tools:** Brush, eraser, color picker, width slider
- **Real-time sync:** Live streaming of stroke points and cursor positions
- **User indicators:** Live cursors with user-assigned colors; online user list
- **Global undo/redo:** Server-maintained operation log ensures all users stay in sync
- **Conflict handling:** Server-ordered operations for consistent canvas state
- **Performance optimizations:** `requestAnimationFrame` rendering, throttled network updates
- **Mobile support:** Touch-enabled drawing

---
Hosted Demo : https://falm-assignment.onrender.com/

## Setup

**Requirements:** Node 18+  

1. Clone the repository and install dependencies:

   ```bash
   npm install


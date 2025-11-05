function createDrawingState() {
  let seq = 0; // server sequence for committed ops
  const committedOps = []; // [{ seq, ...op }]
  const redoStack = []; // ops previously undone
  const activeByUser = new Map(); // userId -> op (in-progress stroke)

  function startActiveStroke(userId, op) {
    activeByUser.set(userId, op);
  }

  function addPointToActiveStroke(userId, point) {
    const op = activeByUser.get(userId);
    if (!op) return null;
    op.points.push(point);
    return op;
  }

  function commitActiveStroke(userId) {
    const op = activeByUser.get(userId);
    if (!op) return null;
    activeByUser.delete(userId);
    // New committed op invalidates redo stack
    redoStack.length = 0;
    const committed = { ...op, seq: ++seq };
    committedOps.push(committed);
    return committed;
  }

  function commitOp(op) {
    redoStack.length = 0;
    const committed = { ...op, seq: ++seq };
    committedOps.push(committed);
    return committed;
  }

  function cancelActiveStroke(userId) {
    activeByUser.delete(userId);
  }

  function undo() {
    if (committedOps.length === 0) return null;
    const last = committedOps.pop();
    redoStack.push(last);
    return { type: 'revert', opId: last.id, seq: last.seq };
  }

  function redo() {
    if (redoStack.length === 0) return null;
    const op = redoStack.pop();
    committedOps.push(op);
    return op;
  }

  function getCommittedOps() {
    return committedOps.slice();
  }

  function replaceCommittedOps(newOps) {
    committedOps.length = 0;
    redoStack.length = 0;
    activeByUser.clear();
    seq = 0;
    for (const op of newOps) {
      const withSeq = { ...op, seq: ++seq };
      committedOps.push(withSeq);
    }
  }

  function getActiveStrokesPublic() {
    return Array.from(activeByUser.entries()).map(([userId, op]) => ({
      userId,
      head: op.points[op.points.length - 1],
      color: op.color,
      width: op.width,
      mode: op.mode
    }));
  }

  return {
    startActiveStroke,
    addPointToActiveStroke,
    commitActiveStroke,
    commitOp,
    cancelActiveStroke,
    undo,
    redo,
    getCommittedOps,
    replaceCommittedOps,
    getActiveStrokesPublic
  };
}

module.exports = { createDrawingState };



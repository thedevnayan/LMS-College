const { ApiError } = require('../middleware/errorHandler');
const queues = new Map();

// Single-instance scheduling only. All outcomes still commit to MongoDB; a
// restart loses pending, unacknowledged requests, which clients may safely retry.
function serializeRoom(id, action) {
  const key = String(id);
  const state = queues.get(key) || { tail: Promise.resolve(), pending: 0 };
  if (state.pending >= 500) return Promise.reject(new ApiError(429, 'ROOM_BUSY', 'Test room is busy; retry shortly'));
  state.pending++;
  const work = state.tail.then(action);
  state.tail = work.catch(() => {});
  queues.set(key, state);
  return work.finally(() => {
    state.pending--;
    if (!state.pending) queues.delete(key);
  });
}
module.exports = { serializeRoom };

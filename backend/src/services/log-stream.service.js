const clients = new Map();

/**
 * Register a client
 */
const subscribe = (projectId, res) => {
  if (!clients.has(projectId)) {
    clients.set(projectId, new Set());
  }

  clients.get(projectId).add(res);
};

/**
 * Remove a client
 */
const unsubscribe = (projectId, res) => {
  const set = clients.get(projectId);

  if (!set) return;

  set.delete(res);

  if (set.size === 0) {
    clients.delete(projectId);
  }
};

/**
 * Send a message to every connected browser
 */
const broadcast = (projectId, message) => {
  const set = clients.get(projectId);

  if (!set) {
    return;
  }

  for (const res of set) {
    res.write(
      `data: ${JSON.stringify({
        message,
        timestamp: new Date().toISOString(),
      })}\n\n`,
    );
  }
};

module.exports = {
  subscribe,
  unsubscribe,
  broadcast,
};

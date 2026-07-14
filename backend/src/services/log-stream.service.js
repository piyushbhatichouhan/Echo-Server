const clients = new Map();

/**
 * Register a client
 */
const subscribe = (projectId, res) => {
  console.log("Client subscribed:", projectId);
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
  console.log("Broadcast called:", projectId, message);

  const set = clients.get(projectId);

  if (!set) {
    console.log("No clients subscribed");
    return;
  }

  console.log("Clients:", set.size);

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

const logClassifier = require("./logClassifier.service");

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
const broadcast = (projectId, payload) => {
  const set = clients.get(projectId);

  if (!set || set.size === 0) {
    return;
  }

  let formatted;

  if (typeof payload === "string") {
    const classified = logClassifier.classify(payload);
    if (classified.isNoise) {
      return;
    }
    formatted = {
      id: `live_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      message: classified.message,
      level: classified.level,
      category: classified.category,
    };
  } else if (payload && typeof payload === "object") {
    formatted = {
      id: payload.id || `live_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: payload.timestamp || new Date().toISOString(),
      message: payload.message || "",
      level: payload.level || "info",
      category: payload.category || "system",
    };
  } else {
    return;
  }

  for (const res of set) {
    try {
      res.write(`data: ${JSON.stringify(formatted)}\n\n`);
    } catch (err) {
      // Socket might have closed
    }
  }
};

module.exports = {
  subscribe,
  unsubscribe,
  broadcast,
};

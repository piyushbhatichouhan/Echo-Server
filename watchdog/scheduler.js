const startScheduler = (task, intervalMs) => {
  // Run immediately
  task();

  // Run periodically
  setInterval(task, intervalMs);
};

module.exports = {
  startScheduler,
};

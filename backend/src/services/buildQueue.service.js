/**
 * BuildQueue Service
 * Controls Docker image build concurrency to prevent CPU and RAM starvation on multi-core hosts.
 * Gives real-time feedback to deployment logs when builds are queued.
 */
class BuildQueue {
  constructor() {
    this.queue = [];
    this.activeBuilds = new Map(); // id -> { projectId, queuedAt, startedAt }
    this.maxConcurrent = Math.max(1, Number(process.env.MAX_CONCURRENT_BUILDS) || 1);
    this.totalProcessed = 0;
    this.taskCounter = 1;
  }

  /**
   * Enqueues a build task and runs it when a slot is free.
   * @param {string|number} projectId
   * @param {Function} callback - Stream log function (message) => Promise<void>
   * @param {Function} task - Async function performing docker build
   */
  async run(projectId, callback, task) {
    const isSlotAvailable = this.activeBuilds.size < this.maxConcurrent;
    const taskId = `task_${Date.now()}_${this.taskCounter++}`;

    if (!isSlotAvailable && typeof callback === "function") {
      const position = this.queue.length + 1;
      try {
        await callback(
          `[Resource Shield] Queued for compilation (Position in queue: ${position})...`,
        );
      } catch {}
    }

    return new Promise((resolve, reject) => {
      this.queue.push({
        taskId,
        projectId,
        callback,
        task,
        resolve,
        reject,
        queuedAt: Date.now(),
      });
      this.processNext();
    });
  }

  async processNext() {
    if (this.activeBuilds.size >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    const waitTimeSec = Math.round((Date.now() - item.queuedAt) / 1000);

    this.activeBuilds.set(item.taskId, {
      projectId: item.projectId,
      queuedAt: item.queuedAt,
      startedAt: Date.now(),
    });

    if (waitTimeSec >= 1 && typeof item.callback === "function") {
      try {
        await item.callback(
          `[Resource Shield] Compilation slot acquired after ${waitTimeSec}s wait. Starting compilation...`,
        );
      } catch {}
    }

    try {
      const result = await item.task();
      item.resolve(result);
    } catch (err) {
      item.reject(err);
    } finally {
      this.activeBuilds.delete(item.taskId);
      this.totalProcessed++;
      this.processNext();
    }
  }

  getStatus() {
    return {
      active: this.activeBuilds.size,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      totalProcessed: this.totalProcessed,
      currentBuilds: Array.from(this.activeBuilds.values()),
    };
  }
}

module.exports = new BuildQueue();

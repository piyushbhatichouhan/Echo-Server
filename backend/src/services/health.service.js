const http = require("http");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForHealth = async (port, timeout = 30000, interval = 1000) => {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}/health`, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject();
          }

          res.resume();
        });

        req.on("error", reject);

        req.setTimeout(2000, () => {
          req.destroy();
          reject();
        });
      });

      return true;
    } catch {
      await sleep(interval);
    }
  }

  return false;
};

module.exports = {
  waitForHealth,
};

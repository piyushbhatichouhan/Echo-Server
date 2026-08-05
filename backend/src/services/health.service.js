const axios = require("axios");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const checkApplication = async (
  port,
  { retries = 10, delay = 1000, timeout = 3000 } = {},
) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await axios.get(`http://127.0.0.1:${port}`, {
        timeout,
        validateStatus: () => true,
      });

      return true;
    } catch {
      if (attempt < retries) {
        await sleep(delay);
      }
    }
  }

  return false;
};

module.exports = {
  checkApplication,
};

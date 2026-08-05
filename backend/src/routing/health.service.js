const axios = require("axios");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const checkPublication = async (
  hostname,
  { retries = 10, delay = 1000, timeout = 3000 } = {},
) => {
  const url = `http://127.0.0.1:8080`;

  for (let i = 0; i < retries; i++) {
    try {
      await axios.get(url, {
        timeout,
        validateStatus: () => true,
        headers: {
          Host: hostname,
        },
      });

      return true;
    } catch {}

    await sleep(delay);
  }

  return false;
};

module.exports = {
  checkPublication,
};

const axios = require("axios");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const checkApplication = async (
  port,
  { retries = 20, delay = 1000, timeout = 3000 } = {},
) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(`http://127.0.0.1:${port}`, {
        timeout,
        validateStatus: () => true,
      });

      console.log(
        `[Health] Application responded on attempt ${attempt} (${response.status})`,
      );

      return true;
    } catch (error) {
      console.log(
        `[Health] Attempt ${attempt}/${retries} failed: ${error.code || error.message}`,
      );

      if (attempt < retries) {
        await sleep(delay);
      }
    }
  }

  console.log("[Health] Application failed health check.");

  return false;
};

module.exports = {
  checkApplication,
};

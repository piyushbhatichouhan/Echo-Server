const axios = require("axios");

const containerService = require("./container.service");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const checkApplication = async (
  projectId,
  port,
  { retries = 20, delay = 1000, timeout = 3000 } = {},
) => {
  const ip = await containerService.getContainerIPAddress(projectId);
  console.log("[Health] Container IP:", ip);
  console.log("[Health] Checking:", `http://${ip}:${port}`);
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(`http://${ip}:${port}`, {
        timeout,
        validateStatus: () => true,
      });

      console.log(
        `[Health] Healthy on attempt ${attempt} (${response.status})`,
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

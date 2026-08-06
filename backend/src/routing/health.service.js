const axios = require("axios");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const checkPublication = async (
  hostname,
  { retries = 10, delay = 1000, timeout = 3000 } = {},
) => {
  const url = "http://npm";

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout,
        headers: {
          Host: hostname,
        },
        validateStatus: () => true,
      });

      //
      // Router is reachable and hostname resolved correctly.
      // These responses are considered healthy during deployment.
      //
      if (
        response.status === 200 ||
        (response.status === 503 &&
          [
            "Project has never been deployed",
            "Project is not running",
          ].includes(response.data?.message))
      ) {
        console.log(
          `[Publication Health] Healthy on attempt ${attempt} (${response.status})`,
        );

        return true;
      }

      console.log(`[Publication Health] Attempt ${attempt}/${retries}`);
      console.log("Status:", response.status);
      console.log("Body:", response.data);
    } catch (err) {
      console.log(`[Publication Health] Attempt ${attempt}/${retries}`);
      console.log("Status:", err.response?.status);
      console.log("Body:", err.response?.data);
      console.log("Code:", err.code);
    }

    if (attempt < retries) {
      await sleep(delay);
    }
  }

  console.log("[Publication Health] Publication failed health check.");

  return false;
};

module.exports = {
  checkPublication,
};

const axios = require("axios");

let token = null;

const api = axios.create({
  baseURL: process.env.NPM_URL,
  timeout: 10000,
});

const login = async () => {
  const response = await api.post("/api/tokens", {
    identity: process.env.NPM_EMAIL,
    secret: process.env.NPM_PASSWORD,
  });

  token = response.data.token;

  return token;
};

const request = async (config) => {
  if (!token) {
    await login();
  }

  try {
    return await api({
      ...config,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(config.headers || {}),
      },
    });
  } catch (err) {
    // token expired
    if (err.response?.status === 401) {
      await login();

      return await api({
        ...config,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(config.headers || {}),
        },
      });
    }
    console.error("NPM Status:", err.response?.status);
    console.error("NPM Response:", err.response?.data);
    console.dir(err.response?.data, { depth: null });
    throw err;
  }
};

module.exports = {
  request,
};

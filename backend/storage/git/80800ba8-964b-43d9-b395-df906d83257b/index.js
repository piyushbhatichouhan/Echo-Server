const express = require("express");
const axios = require("axios");

const app = express();

const PORT = process.env.PORT || 3001;

const API_URL = process.env.API_URL;

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Echo deployment test",
    api: API_URL,
  });
});

app.get("/joke", async (req, res) => {
  try {
    const response = await axios.get(API_URL);

    res.json(response.data);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
  console.log(`API_URL = ${API_URL}`);
  console.log("hello world test1");
});

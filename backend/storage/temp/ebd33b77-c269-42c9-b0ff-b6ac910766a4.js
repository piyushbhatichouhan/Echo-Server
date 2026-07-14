const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("Echo Hub works!");
});

app.listen(3005);

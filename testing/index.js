const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>EchoHub</title>
      </head>
      <body style="font-family:sans-serif;text-align:center;padding-top:50px">
        <h1>🚀 EchoHub Deployment Successful</h1>
        <p>Your application is running inside Docker.</p>
        <p><b>Port:</b> ${PORT}</p>
        <p><b>Time:</b> ${new Date().toISOString()}</p>
      </body>
    </html>
  `);
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "running",
    port: PORT,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Hey there!");
});

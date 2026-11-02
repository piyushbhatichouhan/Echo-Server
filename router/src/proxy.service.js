const httpProxy = require("http-proxy");

const proxy = httpProxy.createProxyServer({});

// Handle proxy errors (e.g. target container down or restarting) to prevent router crashes
proxy.on("error", (err, req, res) => {
  console.error("[Proxy Error]:", err.message);

  if (res && !res.headersSent) {
    res.status(502).json({
      success: false,
      message: "Target application is currently unavailable or restarting.",
      error: err.code || err.message,
    });
  }
});

const proxyRequest = (req, res, deployment) => {
  // Support both local host development (localhost:port) and production Docker (containerName:containerPort)
  const targetHost =
    process.env.ROUTER_TARGET === "localhost"
      ? `localhost:${deployment.port}`
      : `${deployment.containerName}:${deployment.containerPort}`;

  const target = `http://${targetHost}`;

  console.log("[Proxy] Target:", target);

  proxy.web(req, res, {
    target,
    changeOrigin: true,
  });
};

module.exports = {
  proxyRequest,
};

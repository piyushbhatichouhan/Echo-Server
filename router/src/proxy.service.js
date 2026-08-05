const httpProxy = require("http-proxy");

const proxy = httpProxy.createProxyServer({});

const proxyRequest = (req, res, deployment) => {
  let target;

  if (process.env.ROUTER_TARGET === "docker") {
    target = `http://${deployment.containerName}:3000`;
  } else {
    target = `http://localhost:${deployment.port}`;
  }

  proxy.web(req, res, {
    target,
    changeOrigin: true,
  });
};

module.exports = {
  proxyRequest,
};

const httpProxy = require("http-proxy");

const proxy = httpProxy.createProxyServer({});

const proxyRequest = (req, res, deployment) => {
  const target = `http://${deployment.containerName}:${deployment.containerPort}`;

  console.log("[Proxy] Target:", target);

  proxy.web(req, res, {
    target,
    changeOrigin: true,
  });
};

module.exports = {
  proxyRequest,
};

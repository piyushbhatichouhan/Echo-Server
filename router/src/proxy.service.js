const httpProxy = require("http-proxy");

const proxy = httpProxy.createProxyServer({});

const proxyRequest = (req, res, deployment) => {
  const target = `http://${deployment.containerName}:80`;

  proxy.web(req, res, {
    target,
    changeOrigin: true,
  });
};

module.exports = {
  proxyRequest,
};

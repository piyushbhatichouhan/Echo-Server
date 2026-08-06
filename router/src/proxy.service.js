const httpProxy = require("http-proxy");

const proxy = httpProxy.createProxyServer({});

const proxyRequest = (req, res, deployment) => {
  target = `http://${deployment.containerName}:${deployment.containerPort}`;

  proxy.web(req, res, {
    target,
    changeOrigin: true,
  });
};

module.exports = {
  proxyRequest,
};

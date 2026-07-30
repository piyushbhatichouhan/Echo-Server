module.exports = {
  deployment: require("./deployment.infrastructure"),
  logger: require("./logger.infrastructure"),
  docker: require("./docker.infrastructure"),
  container: require("./container.infrastructure"),
  git: require("./git.infrastructure"),
  publisher: require("./publisher.infrastructure"),
  nginx: require("./nginx.infrastructure"),
  verification: require("./verification.infrastructure"),
  process: require("./process.infrastructure"),
};

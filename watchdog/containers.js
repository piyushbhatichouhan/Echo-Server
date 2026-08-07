module.exports = [
  {
    name: "echo-postgres",
    type: "database",
    critical: true,
    dependsOn: [],
  },
  {
    name: "echo-backend",
    type: "backend",
    critical: true,
    dependsOn: ["echo-postgres"],
  },
  {
    name: "echo-router",
    type: "router",
    critical: true,
    dependsOn: ["echo-backend"],
  },
  {
    name: "echo-frontend",
    type: "frontend",
    critical: true,
    dependsOn: ["echo-router"],
  },
  {
    name: "nginx-proxy-manager",
    type: "proxy",
    critical: true,
    dependsOn: [],
  },
];

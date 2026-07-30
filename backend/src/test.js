const runner = require("./services/deployment/commandRunner.service");

(async () => {
  const result = await runner.runCommand({
    cwd: process.cwd(),
    command: "git --version",
  });

  console.log(result);
})();

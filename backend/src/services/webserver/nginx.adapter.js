const fs = require("fs/promises");
const path = require("path");

const storage = require("../../config/storage");

const publishStaticSite = async (context) => {
  console.log(context);

  const { project, settings, publishedDirectory } = context;

  console.log({
    project,
    settings,
    publishedDirectory,
  });

  const config = `
server {

    listen ${project.port};

    server_name localhost;

    root "${publishedDirectory.replace(/\\/g, "/")}";

    index index.html;

    location / {

        try_files $uri $uri/ /index.html;

    }

}
`;

  const file = path.join(storage.nginx.configDirectory, `${project.id}.conf`);

  await fs.writeFile(file, config);

  console.log("Generated nginx config:", file);
};

const removeStaticSite = async (projectId) => {};

module.exports = {
  publishStaticSite,
  removeStaticSite,
};

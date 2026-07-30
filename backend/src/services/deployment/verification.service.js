const fs = require("fs/promises");
const path = require("path");

const verifyStaticDeployment = async (publishedDirectory) => {
  // Does the folder exist?
  await fs.access(publishedDirectory);

  console.log("Verifying:", publishedDirectory);
  // Read its contents
  const entries = await fs.readdir(publishedDirectory);

  if (entries.length === 0) {
    throw new Error("Published directory is empty.");
  }

  // Require index.html
  const indexFile = path.join(publishedDirectory, "index.html");

  try {
    await fs.access(indexFile);
  } catch {
    throw new Error(
      "Deployment failed: index.html was not found in the output directory.",
    );
  }

  return true;
};

module.exports = {
  verifyStaticDeployment,
};

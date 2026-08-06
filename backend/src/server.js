require("dotenv").config();

const app = require("./app");
const { connectDatabase } = require("./config/database");
const { validateStartup } = require("./startup/validator");

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  console.log("🚀 Starting Echo API...");
  console.log("🔄 Connecting to PostgreSQL...");

  await connectDatabase();
  await validateStartup();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port, helloo ${PORT}`);
  });
};

startServer();

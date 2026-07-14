require("dotenv").config();

const app = require("./app");
const { connectDatabase } = require("./config/database");

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  console.log("🚀 Starting Echo API...");
  console.log("🔄 Connecting to PostgreSQL...");

  await connectDatabase();

  app.listen(PORT, () => {
    console.log(`✅ Echo API is running on port ${PORT}`);
  });
};

startServer();

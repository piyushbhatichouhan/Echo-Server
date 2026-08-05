require("dotenv").config();

const app = require("./src/app");
const { connectDatabase } = require("./src/config/database");

const PORT = process.env.PORT || 8080;

(async () => {
  try {
    console.log("Connecting to PostgreSQL database...");

    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`Echo Router is running on port ${PORT}`);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

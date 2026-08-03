const { pool } = require("../config/database");

const userRepository = require("../repositories/user.repository");
const projectRepository = require("../repositories/project.repository");

const projectCleanupService = require("../services/project-cleanup.service");

const runUserDeletionJob = async () => {
  try {
    const users = await userRepository.getExpiredUsers();

    for (const user of users) {
      if (user.is_owner) {
        console.error(
          `[SECURITY] Owner account (${user.email}) was somehow scheduled for deletion. Skipping.`,
        );

        continue;
      }

      try {
        console.log(`[UserDeletion] Permanently deleting ${user.email}`);

        const projects = await projectRepository.getProjectsByOwner(user.id);

        // Clean filesystem first
        for (const project of projects) {
          await projectCleanupService.cleanupProject(project.id);
        }

        // Then perform database deletion atomically
        const client = await pool.connect();

        try {
          await client.query("BEGIN");

          for (const project of projects) {
            await projectRepository.deleteProjectRecordTx(client, project.id);
          }

          await userRepository.deleteUserTx(client, user.id);

          await client.query("COMMIT");

          console.log(`[UserDeletion] ${user.email} permanently deleted.`);
        } catch (err) {
          await client.query("ROLLBACK");
          throw err;
        } finally {
          client.release();
        }
      } catch (err) {
        console.error(`[UserDeletion] Failed to delete ${user.email}`, err);
      }
    }
  } catch (err) {
    console.error("[UserDeletion]", err);
  }
};

module.exports = {
  runUserDeletionJob,
};

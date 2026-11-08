require("dotenv").config();
const { pool } = require("../config/database");
const docker = require("../docker/docker.client");
const portService = require("../services/port.service");

async function main() {
  console.log("==================================================");
  console.log("   EchoServer Pseudo-Port & Container Cleanup Tool   ");
  console.log("==================================================");

  try {
    // 1. Inspect current deployments
    const current = await pool.query(`
      SELECT id, project_id, port, status, created_at
      FROM deployments
      WHERE port IS NOT NULL
      ORDER BY port
    `);

    console.log(`\nFound ${current.rows.length} total deployment records holding ports:`);
    for (const row of current.rows) {
      console.log(`  - Port: ${row.port} | Status: ${row.status.padEnd(10)} | Deployment: ${row.id.slice(0, 8)} | Project: ${row.project_id}`);
    }

    // 2. Perform database cleanup
    console.log("\nReleasing pseudo-allocated ports from inactive deployments...");
    const cleaned = await portService.cleanupPseudoPorts();
    console.log(`✓ Cleaned up ${cleaned} pseudo-allocated database ports.`);

    // 3. Inspect Docker containers
    console.log("\nInspecting Docker containers for allocated host ports (3001-3999)...");
    try {
      const containers = await docker.listContainers({ all: true });
      let removedCount = 0;

      for (const c of containers) {
        const ports = (c.Ports || []).filter((p) => p.PublicPort >= 3001 && p.PublicPort <= 3999);
        if (ports.length > 0) {
          const containerName = c.Names?.[0] || c.Id.slice(0, 12);
          const portList = ports.map((p) => `${p.PublicPort}->${p.PrivatePort}`).join(", ");
          console.log(`  - Container: ${containerName} (${c.State}) holds port(s): ${portList}`);

          // If container is not running, or if it's dead, remove it
          if (c.State === "exited" || c.State === "dead" || c.State === "created") {
            console.log(`    -> Removing dead/exited container ${c.Id.slice(0, 12)} to free port...`);
            const cont = docker.getContainer(c.Id);
            try { await cont.remove({ force: true }); removedCount++; } catch {}
          }
        }
      }
      console.log(`✓ Cleaned up ${removedCount} stale Docker containers.`);
    } catch (dockerErr) {
      console.warn(`[Warning] Docker daemon check skipped: ${dockerErr.message}`);
    }

    // 4. Print remaining active ports
    const remaining = await pool.query(`
      SELECT id, project_id, port, status
      FROM deployments
      WHERE port IS NOT NULL AND status = 'running'
      ORDER BY port
    `);

    console.log(`\nRemaining Active Running Ports: ${remaining.rows.length}`);
    for (const row of remaining.rows) {
      console.log(`  - Port ${row.port} -> Project: ${row.project_id} (Deployment #${row.id.slice(0, 8)})`);
    }

    console.log("\n✓ Cleanup completed successfully.");
  } catch (err) {
    console.error("Cleanup failed:", err);
  } finally {
    await pool.end();
  }
}

main();

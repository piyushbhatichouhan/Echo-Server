import "./Overview.css";

export default function Overview({ overview, loading }) {
  const formatBytes = (bytes = 0) => {
    const units = ["B", "KB", "MB", "GB", "TB"];

    let value = bytes;
    let unit = 0;

    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit++;
    }

    return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
  };

  if (loading) {
    return (
      <div className="overviewLoading">Loading storage information...</div>
    );
  }

  const usage =
    overview.totalDisk === 0
      ? 0
      : (overview.usedDisk / overview.totalDisk) * 100;

  return (
    <div className="overviewPage">
      {/* Hero */}

      <section className="overviewHero">
        <div className="overviewHeroInfo">
          <span className="overviewLabel">STORAGE OVERVIEW</span>

          <h2>{formatBytes(overview.usedDisk)}</h2>

          <p>used of {formatBytes(overview.totalDisk)}</p>

          <div className="overviewProgress">
            <div
              className="overviewProgressFill"
              style={{ width: `${usage}%` }}
            />
          </div>

          <small>{formatBytes(overview.freeDisk)} free</small>
        </div>

        <div className="overviewHealthCard">
          <span className="overviewHealth">● Healthy</span>

          <div className="overviewPercentage">{usage.toFixed(1)}%</div>

          <small>Disk Usage</small>
        </div>
      </section>

      {/* Categories */}

      <section>
        <div className="sectionHeader">
          <h3>Storage Categories</h3>
        </div>

        <div className="overviewGrid">
          <div className="overviewCard">
            <span className="overviewEmoji">📁</span>

            <div>
              <h4>Projects</h4>
              <strong>{formatBytes(overview.projects)}</strong>
            </div>
          </div>

          <div className="overviewCard">
            <span className="overviewEmoji">🌿</span>

            <div>
              <h4>Git</h4>
              <strong>{formatBytes(overview.git)}</strong>
            </div>
          </div>

          <div className="overviewCard">
            <span className="overviewEmoji">☁</span>

            <div>
              <h4>Cloud</h4>
              <strong>{formatBytes(overview.cloud)}</strong>
            </div>
          </div>

          <div className="overviewCard">
            <span className="overviewEmoji">💾</span>

            <div>
              <h4>Backups</h4>
              <strong>{formatBytes(overview.backups)}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Distribution */}

      <section className="distributionCard">
        <div className="sectionHeader">
          <h3>Storage Distribution</h3>
        </div>

        <div className="distributionList">
          <Distribution
            label="Projects"
            value={overview.projects}
            total={overview.usedDisk}
            color="#ff8a00"
          />

          <Distribution
            label="Git"
            value={overview.git}
            total={overview.usedDisk}
            color="#6ab04c"
          />

          <Distribution
            label="Cloud"
            value={overview.cloud}
            total={overview.usedDisk}
            color="#4da3ff"
          />

          <Distribution
            label="Backups"
            value={overview.backups}
            total={overview.usedDisk}
            color="#9b59b6"
          />
        </div>
      </section>
    </div>
  );
}

function Distribution({ label, value, total, color }) {
  const percentage = total === 0 ? 0 : (value / total) * 100;

  return (
    <div className="distributionRow">
      <span>{label}</span>

      <div className="distributionBar">
        <div
          className="distributionFill"
          style={{
            width: `${percentage}%`,
            background: color,
          }}
        />
      </div>

      <span>{percentage.toFixed(1)}%</span>
    </div>
  );
}

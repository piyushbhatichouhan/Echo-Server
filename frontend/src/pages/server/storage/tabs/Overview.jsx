import { useMemo } from "react";
import {
  HardDrive,
  FolderKanban,
  GitBranch,
  Cloud,
  Database,
  CheckCircle2,
  AlertTriangle,
  PieChart,
  Layers,
} from "lucide-react";
import "./Overview.css";

function formatBytes(bytes = 0) {
  if (bytes == null || isNaN(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = Number(bytes);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

export default function Overview({ overview, loading }) {
  if (loading || !overview) {
    return (
      <div className="overview-skeleton-container">
        <div className="overview-hero-skeleton" />
        <div className="overview-grid-skeleton">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="overview-card-skeleton" />
          ))}
        </div>
        <div className="overview-dist-skeleton" />
      </div>
    );
  }

  const totalDisk = overview.totalDisk || 1;
  const usedDisk = overview.usedDisk || 0;
  const freeDisk = overview.freeDisk || 0;
  const usagePercentage = Math.min(100, Math.max(0, (usedDisk / totalDisk) * 100));

  const projectsBytes = overview.projects || 0;
  const gitBytes = overview.git || 0;
  const cloudBytes = overview.cloud || 0;
  const backupsBytes = overview.backups || 0;

  const totalTrackedCategories = projectsBytes + gitBytes + cloudBytes + backupsBytes;
  const denominator = totalTrackedCategories > 0 ? totalTrackedCategories : 1;

  const categories = [
    {
      id: "projects",
      title: "Projects",
      desc: "Workspace source files, builds, and artifacts",
      bytes: projectsBytes,
      icon: FolderKanban,
      color: "var(--accent)",
      pct: ((projectsBytes / denominator) * 100).toFixed(1),
    },
    {
      id: "git",
      title: "Git Repositories",
      desc: "Cloned git working trees & local objects",
      bytes: gitBytes,
      icon: GitBranch,
      color: "#4ade80",
      pct: ((gitBytes / denominator) * 100).toFixed(1),
    },
    {
      id: "cloud",
      title: "Cloud Storage",
      desc: "User uploaded assets & cloud bucket files",
      bytes: cloudBytes,
      icon: Cloud,
      color: "#38bdf8",
      pct: ((cloudBytes / denominator) * 100).toFixed(1),
    },
    {
      id: "backups",
      title: "Database & Backups",
      desc: "PostgreSQL database dumps and snapshots",
      bytes: backupsBytes,
      icon: Database,
      color: "#c084fc",
      pct: ((backupsBytes / denominator) * 100).toFixed(1),
    },
  ];

  return (
    <div className="storage-overview-tab">
      {/* Hero Storage Gauge Card */}
      <section className="storage-hero-card">
        <div className="hero-left-col">
          <div className="hero-label-row">
            <HardDrive size={15} className="hero-drive-icon" />
            <span className="hero-drive-label">HOST SYSTEM STORAGE</span>
          </div>

          <div className="hero-usage-row">
            <h2 className="hero-used-val">{formatBytes(usedDisk)}</h2>
            <span className="hero-total-val">used of {formatBytes(totalDisk)} total</span>
          </div>

          <div className="hero-progress-track">
            <div
              className={`hero-progress-fill ${
                usagePercentage > 90
                  ? "fill--danger"
                  : usagePercentage > 75
                    ? "fill--warning"
                    : "fill--normal"
              }`}
              style={{ width: `${Math.max(3, usagePercentage)}%` }}
            />
          </div>

          <div className="hero-footer-row">
            <span className="hero-free-badge">
              <strong>{formatBytes(freeDisk)}</strong> free capacity available
            </span>
          </div>
        </div>

        <div className="hero-health-box">
          <div className="health-status-badge">
            <span className="health-dot" />
            <span>Healthy Storage Pool</span>
          </div>

          <div className="health-percentage-val">{usagePercentage.toFixed(1)}%</div>
          <span className="health-sub">Disk Saturation</span>
        </div>
      </section>

      {/* 4 Storage Categories Grid */}
      <section className="storage-categories-section">
        <div className="section-title-row">
          <Layers size={17} className="section-title-icon" />
          <h3>Storage Breakdown by Service</h3>
        </div>

        <div className="categories-grid">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.id} className="category-metric-card">
                <div className="cat-card-top">
                  <div
                    className="cat-icon-wrap"
                    style={{
                      background: `${cat.color}20`,
                      color: cat.color,
                      borderColor: `${cat.color}40`,
                    }}
                  >
                    <Icon size={20} />
                  </div>

                  <span className="cat-pct-tag" style={{ color: cat.color }}>
                    {cat.pct}%
                  </span>
                </div>

                <div className="cat-card-body">
                  <span className="cat-title">{cat.title}</span>
                  <h4 className="cat-bytes">{formatBytes(cat.bytes)}</h4>
                  <p className="cat-desc">{cat.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Storage Distribution Visualization Card */}
      <section className="storage-distribution-card">
        <div className="section-title-row">
          <PieChart size={17} className="section-title-icon" />
          <h3>Storage Distribution Breakdown</h3>
        </div>

        {/* Multi-Segment Stacked Progress Bar */}
        <div className="stacked-progress-bar">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="stacked-bar-segment"
              style={{
                width: `${Math.max(Number(cat.pct) > 0 ? 3 : 0, Number(cat.pct))}%`,
                background: cat.color,
              }}
              title={`${cat.title}: ${cat.pct}% (${formatBytes(cat.bytes)})`}
            />
          ))}
        </div>

        {/* Detailed Rows */}
        <div className="distribution-list">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.id} className="distribution-row">
                <div className="dist-row-left">
                  <span
                    className="dist-color-dot"
                    style={{ background: cat.color }}
                  />
                  <Icon size={15} style={{ color: cat.color }} />
                  <span className="dist-label">{cat.title}</span>
                </div>

                <div className="dist-row-center">
                  <div className="dist-bar-track">
                    <div
                      className="dist-bar-fill"
                      style={{
                        width: `${Math.max(2, Number(cat.pct))}%`,
                        background: cat.color,
                      }}
                    />
                  </div>
                </div>

                <div className="dist-row-right">
                  <span className="dist-bytes">{formatBytes(cat.bytes)}</span>
                  <span className="dist-pct" style={{ color: cat.color }}>
                    {cat.pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

import "./Projects.css";

export default function Projects({ projects, loading }) {
  if (loading) {
    return <div className="storagePlaceholder">Loading projects...</div>;
  }

  return (
    <div className="storageTabPage">
      <div className="storageTabHeader">
        <h2>Project Storage</h2>

        <p>View storage usage for every project hosted on EchoHub.</p>
      </div>

      <div className="storageComingSoon">
        <h3>🚧 Under Development</h3>

        <p>This page will allow you to:</p>

        <ul>
          <li>Sort projects by storage usage</li>
          <li>Identify oversized projects</li>
          <li>View project storage breakdown</li>
          <li>Open project directly</li>
        </ul>
      </div>
    </div>
  );
}

import "./Cleanup.css";

export default function Cleanup({ loading }) {
  if (loading) {
    return <div className="storagePlaceholder">Loading...</div>;
  }

  return (
    <div className="storageTabPage">
      <div className="storageTabHeader">
        <h2>Cleanup</h2>

        <p>Free storage by removing unused files and build artifacts.</p>
      </div>

      <div className="storageComingSoon">
        <h3>🚧 Under Development</h3>

        <p>Planned cleanup actions:</p>

        <ul>
          <li>Remove unused build artifacts</li>
          <li>Clear old deployment logs</li>
          <li>Delete unused Docker images</li>
          <li>Clean Git cache</li>
          <li>Remove temporary files</li>
          <li>Analyze storage recommendations</li>
        </ul>
      </div>
    </div>
  );
}

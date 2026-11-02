import { useEffect, useState } from "react";
import Button from "../../../common/button/button";
import { Play, Pause, Volume2, VolumeX, Download, ArrowLeft, Film, Music } from "lucide-react";
import "./MediaViewer.css";

export default function MediaViewer({ file, adapter, onBack, onDownload, isVideo = false }) {
  const [mediaUrl, setMediaUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let url;
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const { blob } = await adapter.getFileBlob(file.id);
        if (active) {
          url = URL.createObjectURL(blob);
          setMediaUrl(url);
        }
      } catch (err) {
        console.error("Failed to load media blob", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file, adapter]);

  return (
    <div className="eh-file-viewer">
      <div className="eh-file-viewer-header">
        <div className="eh-file-viewer-left">
          <Button onClick={onBack}>
            <ArrowLeft size={16} /> Back
          </Button>
          <div className="eh-file-viewer-info">
            <h2>
              {isVideo ? <Film size={18} className="media-title-icon" /> : <Music size={18} className="media-title-icon" />}
              {file.original_name}
            </h2>
            <span className="media-subtitle">
              {isVideo ? "Video Player" : "Audio Player"} • {file.mime_type || (isVideo ? "video/mp4" : "audio/mpeg")}
            </span>
          </div>
        </div>

        <Button variant="secondary" onClick={onDownload}>
          <Download size={16} /> Download
        </Button>
      </div>

      <div className="eh-media-viewer-content">
        {loading ? (
          <div className="eh-media-loading">
            <div className="eh-media-spinner"></div>
            <span>Loading media stream...</span>
          </div>
        ) : mediaUrl ? (
          <div className="eh-media-container">
            {isVideo ? (
              <video
                src={mediaUrl}
                controls
                autoPlay={false}
                className="eh-video-element"
                controlsList="nodownload"
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="eh-audio-card">
                <div className="eh-audio-visualizer">
                  <Music size={48} className="eh-audio-icon" />
                  <div className="eh-audio-waves">
                    <span className="bar"></span>
                    <span className="bar"></span>
                    <span className="bar"></span>
                    <span className="bar"></span>
                    <span className="bar"></span>
                  </div>
                </div>
                <div className="eh-audio-meta">
                  <h3>{file.original_name}</h3>
                  <p>{file.mime_type || "Audio Track"}</p>
                </div>
                <audio
                  src={mediaUrl}
                  controls
                  className="eh-audio-element"
                  controlsList="nodownload"
                >
                  Your browser does not support the audio tag.
                </audio>
              </div>
            )}
          </div>
        ) : (
          <div className="eh-media-error">Failed to load media file.</div>
        )}
      </div>
    </div>
  );
}

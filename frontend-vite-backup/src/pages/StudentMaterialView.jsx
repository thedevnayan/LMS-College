import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { materialsAPI } from '../services/api';
import { ArrowLeft, BookOpen, Download, ExternalLink, Maximize2, Minimize2, CheckCircle } from 'lucide-react';

export default function StudentMaterialView() {
  const { classroomId, materialId } = useParams();
  const navigate = useNavigate();

  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewerLoading, setViewerLoading] = useState(true);
  const [viewerError, setViewerError] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);

  useEffect(() => {
    const fetchMaterial = async () => {
      try {
        const res = await materialsAPI.getById(materialId);
        if (res.success) {
          setMaterial(res.data);
        }
      } catch (err) {
        setError(err.message || 'Failed to load material');
      } finally {
        setLoading(false);
      }
    };
    fetchMaterial();
  }, [materialId]);

  const handleMarkComplete = async () => {
    setMarkingComplete(true);
    try {
      await materialsAPI.markProgress(materialId, true);
      setMaterial(prev => ({ ...prev, completed: true }));
    } catch (err) {
      console.error('Failed to mark as complete', err);
    } finally {
      setMarkingComplete(false);
    }
  };

  /**
   * Build the viewer URL based on material type.
   * PDFs — direct iframe (browser renders natively)
   * PPT/DOC — Microsoft Office Online viewer
   */
  const getViewerUrl = (url, type) => {
    if (!url) return null;
    // PDFs — use browser's native PDF viewer directly
    if (type === 'pdf') {
      return url;
    }
    // PPT / DOC — use Microsoft Office Online viewer
    if (type === 'presentation' || type === 'text') {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    }
    if (type === 'link') {
      return url;
    }
    return null;
  };

  const renderViewer = () => {
    if (!material || !material.url) {
      return (
        <div style={styles.noPreview}>
          <BookOpen size={48} color="var(--color-fog)" />
          <p>No preview available for this material.</p>
        </div>
      );
    }

    const { url, type } = material;

    // Images — render inline
    if (type === 'image') {
      return (
        <div style={styles.imageContainer}>
          <img
            src={url}
            alt={material.title}
            style={styles.image}
            onLoad={() => setViewerLoading(false)}
            onError={() => setViewerLoading(false)}
          />
        </div>
      );
    }

    // Video — HTML5 player
    if (type === 'video') {
      return (
        <div style={styles.videoContainer}>
          <video
            controls
            style={styles.video}
            onLoadedData={() => setViewerLoading(false)}
            onError={() => setViewerLoading(false)}
          >
            <source src={url} />
            Your browser does not support video playback.
          </video>
        </div>
      );
    }

    // PDF, Presentation, Word, Link — iframe
    const viewerUrl = getViewerUrl(url, type);
    if (viewerUrl) {
      return (
        <div style={styles.iframeContainer}>
          {viewerLoading && !viewerError && (
            <div style={styles.iframeLoader}>
              <div className="admin-spinner" />
              <p style={{ color: 'var(--color-fog)', marginTop: '12px', fontSize: '14px' }}>Loading document viewer...</p>
            </div>
          )}
          {viewerError ? (
            <div style={styles.noPreview}>
              <BookOpen size={48} color="var(--color-fog)" />
              <p>Could not load preview in browser.</p>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="admin-btn-primary"
                style={{ marginTop: '12px', padding: '10px 20px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <ExternalLink size={16} /> Open in New Tab
              </a>
            </div>
          ) : (
            <iframe
              src={viewerUrl}
              title={material.title}
              style={{
                ...styles.iframe,
                opacity: viewerLoading ? 0 : 1,
              }}
              onLoad={() => setViewerLoading(false)}
              onError={() => { setViewerLoading(false); setViewerError(true); }}
              frameBorder="0"
              allowFullScreen
            />
          )}
        </div>
      );
    }

    // Fallback
    return (
      <div style={styles.noPreview}>
        <BookOpen size={48} color="var(--color-fog)" />
        <p>Preview not available for this file type.</p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="admin-btn-primary"
          style={{ marginTop: '16px', padding: '12px 24px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <ExternalLink size={18} /> Open in New Tab
        </a>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div className="admin-spinner" />
      </div>
    );
  }

  if (error || !material) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ color: '#991b1b', marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>{error || 'Material not found'}</div>
        <button className="admin-btn-secondary" onClick={() => navigate(`/classrooms/${classroomId}`)}>Go Back</button>
      </div>
    );
  }

  const typeLabels = {
    pdf: 'PDF Document',
    presentation: 'Presentation',
    text: 'Word Document',
    image: 'Image',
    video: 'Video',
    link: 'External Link',
  };

  return (
    <div style={{
      maxWidth: isFullscreen ? '100%' : '1000px',
      margin: '0 auto',
      padding: isFullscreen ? '0' : undefined,
      height: isFullscreen ? '100vh' : undefined,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top Bar */}
      {!isFullscreen && (
        <div style={styles.topBar}>
          <button
            onClick={() => navigate(`/classrooms/${classroomId}`)}
            style={styles.backBtn}
          >
            <ArrowLeft size={18} /> Back to Classroom
          </button>
        </div>
      )}

      {/* Header Card */}
      <div style={{
        ...styles.headerCard,
        ...(isFullscreen ? { borderRadius: 0, border: 'none', boxShadow: 'none', padding: '12px 24px' } : {}),
      }}>
        <div style={styles.headerLeft}>
          <div style={styles.iconBadge}>
            <BookOpen size={isFullscreen ? 20 : 28} color="#4f46e5" />
          </div>
          <div>
            <div style={styles.typeBadge}>
              {typeLabels[material.type] || material.type}
            </div>
            <h1 style={{
              ...styles.title,
              fontSize: isFullscreen ? '18px' : '24px',
            }}>{material.title}</h1>
            {material.topic && (
              <span style={styles.topicChip}>{material.topic}</span>
            )}
          </div>
        </div>

        <div style={styles.headerActions}>
          {!material.completed && (
            <button
              onClick={handleMarkComplete}
              disabled={markingComplete}
              style={styles.completeBtn}
            >
              <CheckCircle size={16} />
              {markingComplete ? 'Saving...' : 'Mark Complete'}
            </button>
          )}
          {material.completed && (
            <span style={styles.completedBadge}>
              <CheckCircle size={14} /> Completed
            </span>
          )}
          <a
            href={material.url}
            target="_blank"
            rel="noreferrer"
            style={styles.downloadBtn}
            title="Download / Open in new tab"
          >
            <Download size={16} />
            {!isFullscreen && <span>Download</span>}
          </a>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            style={styles.fullscreenBtn}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Description (non-fullscreen only) */}
      {!isFullscreen && material.description && (
        <div style={styles.descriptionCard}>
          <p style={{ color: 'var(--color-fog)', lineHeight: '1.6', margin: 0, fontSize: '14px' }}>{material.description}</p>
        </div>
      )}

      {/* Viewer */}
      <div style={{
        ...styles.viewerWrapper,
        flex: isFullscreen ? 1 : undefined,
        minHeight: isFullscreen ? 0 : '600px',
        borderRadius: isFullscreen ? 0 : '16px',
        border: isFullscreen ? 'none' : '2px solid var(--color-ink)',
        boxShadow: isFullscreen ? 'none' : '6px 6px 0px var(--color-ink)',
      }}>
        {renderViewer()}
      </div>
    </div>
  );
}

const styles = {
  topBar: {
    marginBottom: '20px',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'none',
    border: 'none',
    color: 'var(--color-fog)',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '0',
    fontSize: '14px',
  },
  headerCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
    padding: '20px 28px',
    backgroundColor: 'var(--color-paper-white)',
    borderRadius: '16px',
    border: '2px solid var(--color-ink)',
    boxShadow: '6px 6px 0px var(--color-ink)',
    marginBottom: '16px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  iconBadge: {
    padding: '14px',
    backgroundColor: '#e0e7ff',
    borderRadius: '16px',
    border: '2px solid var(--color-ink)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    backgroundColor: 'var(--color-sun-yellow)',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
    border: '1px solid var(--color-ink)',
  },
  title: {
    color: 'var(--color-ink)',
    fontWeight: 900,
    letterSpacing: '-0.5px',
    margin: 0,
  },
  topicChip: {
    display: 'inline-block',
    marginTop: '6px',
    padding: '2px 10px',
    backgroundColor: 'var(--color-ink)',
    color: 'var(--color-sun-yellow)',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 700,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  completeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '10px',
    border: '2px solid #16a34a',
    backgroundColor: '#f0fdf4',
    color: '#16a34a',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  completedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '10px',
    backgroundColor: '#16a34a',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 700,
  },
  downloadBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '10px',
    border: '2px solid var(--color-ink)',
    backgroundColor: 'var(--color-warm-linen)',
    color: 'var(--color-ink)',
    fontSize: '13px',
    fontWeight: 700,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  fullscreenBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    borderRadius: '10px',
    border: '2px solid var(--color-ink)',
    backgroundColor: 'var(--color-paper-white)',
    color: 'var(--color-ink)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  descriptionCard: {
    padding: '16px 24px',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    border: '1px dashed var(--color-fog)',
    marginBottom: '16px',
  },
  viewerWrapper: {
    backgroundColor: '#1a1a2e',
    overflow: 'hidden',
    position: 'relative',
  },
  iframeContainer: {
    width: '100%',
    height: '100%',
    minHeight: '600px',
    position: 'relative',
  },
  iframeLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a2e',
    zIndex: 1,
  },
  iframe: {
    width: '100%',
    height: '100%',
    minHeight: '600px',
    border: 'none',
    transition: 'opacity 0.3s ease',
  },
  imageContainer: {
    width: '100%',
    minHeight: '400px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    backgroundColor: '#f0f0f0',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '80vh',
    borderRadius: '8px',
    objectFit: 'contain',
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
  },
  videoContainer: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    minHeight: '400px',
  },
  video: {
    width: '100%',
    maxHeight: '80vh',
    outline: 'none',
  },
  noPreview: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 40px',
    color: 'var(--color-fog)',
    fontSize: '16px',
    fontWeight: 500,
    gap: '12px',
  },
};

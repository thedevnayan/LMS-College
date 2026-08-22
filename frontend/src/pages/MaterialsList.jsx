import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { materialsAPI } from '../services/api';
import { BookOpen, Plus, FileText, Download, Trash2, Video, Link as LinkIcon, Image as ImageIcon, Eye, X, ExternalLink, Maximize2, Minimize2, Presentation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MaterialsList() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingMaterial, setViewingMaterial] = useState(null);
  const [viewerLoading, setViewerLoading] = useState(true);
  const [viewerError, setViewerError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const res = await materialsAPI.getAll();
      if (res.success) {
        setMaterials(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch materials:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this material?')) {
      try {
        await materialsAPI.delete(id);
        setMaterials(prev => prev.filter(m => m._id !== id));
      } catch (err) {
        console.error('Failed to delete material', err);
      }
    }
  };

  const openViewer = (material) => {
    setViewerLoading(true);
    setViewerError(false);
    setViewingMaterial(material);
    setIsExpanded(false);
  };

  const closeViewer = () => {
    setViewingMaterial(null);
    setIsExpanded(false);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'pdf': return <FileText size={20} color="#dc2626" />; // Red for PDF
      case 'presentation': return <Presentation size={20} color="#ea580c" />; // Orange for PPT
      case 'text': return <FileText size={20} color="#2563eb" />; // Blue for Docs
      case 'video': return <Video size={20} color="#9333ea" />; // Purple for Video
      case 'link': return <LinkIcon size={20} color="#0d9488" />; // Teal for Link
      case 'image': return <ImageIcon size={20} color="#16a34a" />; // Green for Image
      default: return <BookOpen size={20} color="#475569" />;
    }
  };

  const getViewerUrl = (url, type) => {
    if (!url) return null;
    // PDFs — use browser's native PDF viewer directly
    if (type === 'pdf') {
      return url;
    }
    // PPT / DOC — use Microsoft Office Online viewer (more reliable than Google Docs)
    if (type === 'presentation' || type === 'text') {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    }
    if (type === 'link') return url;
    return null;
  };

  const renderViewerContent = (material) => {
    if (!material || !material.url) {
      return (
        <div style={viewerStyles.noPreview}>
          <BookOpen size={48} color="var(--color-fog)" />
          <p>No preview available</p>
        </div>
      );
    }

    const { url, type } = material;

    if (type === 'image') {
      return (
        <div style={viewerStyles.imageContainer}>
          <img
            src={url}
            alt={material.title}
            style={viewerStyles.image}
            onLoad={() => setViewerLoading(false)}
            onError={() => setViewerLoading(false)}
          />
        </div>
      );
    }

    if (type === 'video') {
      return (
        <div style={viewerStyles.videoContainer}>
          <video
            controls
            style={viewerStyles.video}
            onLoadedData={() => setViewerLoading(false)}
            onError={() => setViewerLoading(false)}
          >
            <source src={url} />
            Your browser does not support video playback.
          </video>
        </div>
      );
    }

    const viewerUrl = getViewerUrl(url, type);
    if (viewerUrl) {
      return (
        <div style={viewerStyles.iframeContainer}>
          {viewerLoading && !viewerError && (
            <div style={viewerStyles.iframeLoader}>
              <div className="admin-spinner" />
              <p style={{ color: 'var(--color-fog)', marginTop: '12px', fontSize: '14px' }}>Loading document...</p>
            </div>
          )}
          {viewerError ? (
            <div style={viewerStyles.noPreview}>
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
                ...viewerStyles.iframe,
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

    return (
      <div style={viewerStyles.noPreview}>
        <BookOpen size={48} color="var(--color-fog)" />
        <p>Preview not available for this file type.</p>
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
    );
  };

  const typeLabels = {
    pdf: 'PDF',
    presentation: 'PPT',
    text: 'DOC',
    image: 'IMG',
    video: 'VID',
    link: 'LINK',
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ color: 'var(--color-ink)', fontSize: '28px', letterSpacing: '-1px', marginBottom: '8px' }}>
            Materials Library
          </h1>
          <p style={{ color: 'var(--color-fog)', fontSize: '15px' }}>
            Manage resources shared with your classrooms
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/admin/materials/new')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 24px', borderRadius: '10px',
            backgroundColor: 'var(--color-ink)', color: 'var(--color-pure-white)',
            border: 'none', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
          }}
        >
          <Plus size={18} /> Upload Material
        </motion.button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="admin-spinner" />
        </div>
      ) : materials.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 40px', backgroundColor: 'var(--color-paper-white)', borderRadius: '16px', border: '2px dashed var(--color-fog)' }}>
          <BookOpen size={48} color="var(--color-fog)" style={{ marginBottom: '16px' }} />
          <h3 style={{ color: 'var(--color-ink)', fontSize: '18px', marginBottom: '8px' }}>No materials yet</h3>
          <p style={{ color: 'var(--color-fog)', fontSize: '14px' }}>Upload your first PDF, PPT, or Document to share with a batch.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {materials.map((material) => (
            <div
              key={material._id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '24px',
                backgroundColor: 'var(--color-paper-white)',
                borderRadius: '16px',
                border: '2px solid var(--color-ink)',
                boxShadow: '4px 4px 0px var(--color-ink)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                <div style={{ padding: '12px', backgroundColor: 'var(--color-warm-linen)', borderRadius: '12px', border: '2px solid var(--color-ink)', flexShrink: 0 }}>
                  {getIcon(material.type)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ color: 'var(--color-ink)', fontSize: '18px', marginBottom: '4px', fontWeight: 700 }}>
                    {material.title}
                  </h3>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--color-fog)', fontWeight: 500, flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--color-sun-yellow)', fontWeight: 700, backgroundColor: 'var(--color-ink)', padding: '2px 8px', borderRadius: '4px' }}>
                      {material.topic}
                    </span>
                    <span>Class: {material.classroomId?.courseId?.title} (Batch {material.classroomId?.classBatch}{material.classroomId?.labBatch ? ` / Sub ${material.classroomId.labBatch}` : ''})</span>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                <button
                  onClick={() => openViewer(material)}
                  className="admin-btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', cursor: 'pointer' }}
                >
                  <Eye size={16} /> View
                </button>
                <a
                  href={material.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', padding: '8px 12px' }}
                  title="Download"
                >
                  <Download size={16} />
                </a>
                <button
                  onClick={(e) => handleDelete(material._id, e)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '2px solid var(--color-ink)', backgroundColor: 'transparent', color: 'var(--color-ink)', cursor: 'pointer' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Viewer Modal */}
      <AnimatePresence>
        {viewingMaterial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={viewerStyles.overlay}
            onClick={closeViewer}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{
                ...viewerStyles.modal,
                width: isExpanded ? '98vw' : '90vw',
                maxWidth: isExpanded ? 'none' : '1100px',
                height: isExpanded ? '96vh' : '85vh',
              }}
            >
              {/* Modal Header */}
              <div style={viewerStyles.modalHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div style={{ padding: '8px', backgroundColor: 'var(--color-warm-linen)', borderRadius: '10px', border: '2px solid var(--color-ink)', display: 'flex' }}>
                    {getIcon(viewingMaterial.type)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ color: 'var(--color-ink)', fontSize: '16px', fontWeight: 800, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {viewingMaterial.title}
                    </h3>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
                      <span style={{
                        padding: '2px 8px', backgroundColor: 'var(--color-sun-yellow)',
                        borderRadius: '6px', fontSize: '10px', fontWeight: 800,
                        textTransform: 'uppercase', border: '1px solid var(--color-ink)',
                      }}>
                        {typeLabels[viewingMaterial.type] || viewingMaterial.type}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--color-fog)' }}>{viewingMaterial.topic}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <a
                    href={viewingMaterial.url}
                    target="_blank"
                    rel="noreferrer"
                    style={viewerStyles.headerIconBtn}
                    title="Download"
                  >
                    <Download size={16} />
                  </a>
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={viewerStyles.headerIconBtn}
                    title={isExpanded ? 'Shrink' : 'Expand'}
                  >
                    {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                  <button
                    onClick={closeViewer}
                    style={{ ...viewerStyles.headerIconBtn, backgroundColor: '#fee2e2', color: '#991b1b', borderColor: '#991b1b' }}
                    title="Close"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Modal Body — Viewer */}
              <div style={viewerStyles.modalBody}>
                {renderViewerContent(viewingMaterial)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const viewerStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  modal: {
    backgroundColor: 'var(--color-paper-white)',
    borderRadius: '20px',
    border: '2px solid var(--color-ink)',
    boxShadow: '8px 8px 0px var(--color-ink)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: 'width 0.3s ease, height 0.3s ease, max-width 0.3s ease',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: '2px solid var(--color-ink)',
    backgroundColor: 'var(--color-warm-linen)',
    flexShrink: 0,
  },
  headerIconBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    border: '2px solid var(--color-ink)',
    backgroundColor: 'var(--color-paper-white)',
    color: 'var(--color-ink)',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'all 0.15s',
  },
  modalBody: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1a1a2e',
  },
  iframeContainer: {
    width: '100%',
    height: '100%',
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
    border: 'none',
    transition: 'opacity 0.3s ease',
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    backgroundColor: '#f0f0f0',
    overflow: 'auto',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '100%',
    borderRadius: '8px',
    objectFit: 'contain',
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    maxHeight: '100%',
    outline: 'none',
  },
  noPreview: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--color-fog)',
    fontSize: '16px',
    fontWeight: 500,
    gap: '12px',
    padding: '40px',
  },
};

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { materialsAPI, classroomsAPI } from '../services/api';
import { BookOpen, Plus, FileText, Download, Trash2, Video, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MaterialsList() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const getIcon = (type) => {
    switch (type) {
      case 'pdf': return <FileText size={20} />;
      case 'presentation': return <FileText size={20} />;
      case 'video': return <Video size={20} />;
      case 'link': return <LinkIcon size={20} />;
      case 'image': return <ImageIcon size={20} />;
      default: return <BookOpen size={20} />;
    }
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ padding: '12px', backgroundColor: 'var(--color-warm-linen)', borderRadius: '12px', border: '2px solid var(--color-ink)' }}>
                  {getIcon(material.type)}
                </div>
                <div>
                  <h3 style={{ color: 'var(--color-ink)', fontSize: '18px', marginBottom: '4px', fontWeight: 700 }}>
                    {material.title}
                  </h3>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--color-fog)', fontWeight: 500 }}>
                    <span style={{ color: 'var(--color-sun-yellow)', fontWeight: 700, backgroundColor: 'var(--color-ink)', padding: '2px 8px', borderRadius: '4px' }}>
                      {material.topic}
                    </span>
                    <span>Class: {material.classroomId?.courseId?.title} (Batch {material.classroomId?.classBatch})</span>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <a
                  href={material.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', padding: '8px 16px' }}
                >
                  <Download size={16} /> View
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
    </div>
  );
}

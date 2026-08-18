import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { classroomsAPI, materialsAPI } from '../services/api';
import { ArrowLeft, Save, UploadCloud } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';

export default function MaterialBuilder() {
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '',
    topic: '',
    type: 'pdf',
    classroomId: '',
    description: '',
  });
  const [file, setFile] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    try {
      const res = await classroomsAPI.getAll();
      if (res.success) {
        setClassrooms(res.data);
      }
    } catch (err) {
      console.error('Failed to load classrooms', err);
    }
  };

  const classroomOptions = classrooms.map(c => ({
    value: c._id,
    label: `${c.courseId?.title || 'Unknown Course'} - Batch ${c.classBatch} (${c.type})`
  }));

  const typeOptions = [
    { value: 'pdf', label: 'PDF Document' },
    { value: 'presentation', label: 'Presentation (PPT)' },
    { value: 'text', label: 'Word Document' },
    { value: 'image', label: 'Image' },
    { value: 'video', label: 'Video File' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.classroomId) return setError('Please select a classroom batch');
    if (!formData.title) return setError('Please enter a title');
    if (!formData.topic) return setError('Please enter a topic');
    if (!file) return setError('Please select a file to upload');

    setLoading(true);

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('topic', formData.topic);
      data.append('type', formData.type);
      data.append('classroomId', formData.classroomId);
      data.append('description', formData.description);
      data.append('file', file);

      await materialsAPI.create(formData.classroomId, data);
      navigate('/admin/materials');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Upload failed. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px' }}>
      <button
        onClick={() => navigate('/admin/materials')}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', color: 'var(--color-fog)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '24px' }}
      >
        <ArrowLeft size={16} /> Back to Library
      </button>

      <div style={{ backgroundColor: 'var(--color-paper-white)', padding: '32px', borderRadius: '16px', border: '2px solid var(--color-ink)', boxShadow: '8px 8px 0px var(--color-ink)' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '24px', color: 'var(--color-ink)' }}>
          Upload Material
        </h2>

        {error && (
          <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '24px', fontWeight: 500, border: '2px solid #991b1b' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, color: 'var(--color-ink)', fontSize: '14px' }}>Target Classroom (Batch)</label>
            <CustomSelect
              options={classroomOptions}
              value={formData.classroomId}
              onChange={(val) => setFormData({ ...formData, classroomId: val })}
              placeholder="Select a batch..."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, color: 'var(--color-ink)', fontSize: '14px' }}>Title</label>
              <input
                type="text"
                className="admin-input"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Chapter 1 Notes"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, color: 'var(--color-ink)', fontSize: '14px' }}>Topic</label>
              <input
                type="text"
                className="admin-input"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                placeholder="e.g. Thermodynamics"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, color: 'var(--color-ink)', fontSize: '14px' }}>Material Type</label>
            <CustomSelect
              options={typeOptions}
              value={formData.type}
              onChange={(val) => setFormData({ ...formData, type: val })}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, color: 'var(--color-ink)', fontSize: '14px' }}>File Upload</label>
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '40px 20px', backgroundColor: 'var(--color-warm-linen)',
              border: '2px dashed var(--color-ink)', borderRadius: '12px',
              cursor: 'pointer', transition: 'all 0.2s'
            }}>
              <UploadCloud size={32} color="var(--color-ink)" style={{ marginBottom: '12px' }} />
              <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)' }}>
                {file ? file.name : 'Click or drag file to upload'}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--color-fog)', marginTop: '4px' }}>
                Supports PDF, PPT, Word, and Images (Max 10MB)
              </span>
              <input
                type="file"
                style={{ display: 'none' }}
                onChange={(e) => setFile(e.target.files[0])}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="admin-btn-primary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', fontSize: '16px', marginTop: '16px', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <div className="admin-spinner" style={{ width: '20px', height: '20px', borderTopColor: 'var(--color-sun-yellow)' }} /> : <Save size={18} />}
            {loading ? 'Uploading & Saving...' : 'Publish Material'}
          </button>
        </form>
      </div>
    </div>
  );
}

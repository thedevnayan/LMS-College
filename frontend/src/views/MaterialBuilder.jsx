'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { classroomsAPI, materialsAPI } from '@/services/api';
import { ArrowLeft, Save, UploadCloud } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';

export default function MaterialBuilder() {
  const router = useRouter();
  const [classrooms, setClassrooms] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '',
    topic: '',
    type: 'pdf',
    classroomId: '',
    description: '',
  });
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState('');
  const selectFiles = (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    setError('');
    if (selected.some(file => file.size > 10 * 1024 * 1024)) return setError('Each file must be 10 MB or smaller.');
    if (formData.type === 'image' && files.length + selected.length > 20) return setError('Select up to 20 images per resource.');
    if (formData.type === 'image' && selected.some(file => !/\.(png|jpe?g|webp)$/i.test(file.name))) return setError('Select PNG, JPG or WebP images.');
    setFiles(previous => {
      if (formData.type !== 'image') return selected.slice(0, 1);
      return [...previous, ...selected.filter(file => !previous.some(existing => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified))];
    });
  };
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function fetchClassrooms() {
 return classroomsAPI.list().then((res) => {
if (res.success) {
        setClassrooms(res.data);
      }
}).catch((err) => {
      console.error('Failed to load classrooms', err);
    });
 }

  useEffect(() => {
    fetchClassrooms();
  }, []);



  const classroomOptions = classrooms.map(c => ({
    value: c._id,
    label: `${c.courseId?.title || 'Unknown Course'} - Batch ${c.classBatch}${c.labBatch ? ` / Sub ${c.labBatch}` : ''} (${c.type})`
  }));

  const typeOptions = [
    { value: 'pdf', label: 'PDF Document' },
    { value: 'presentation', label: 'Presentation (PPTX)' },
    { value: 'text', label: 'Word Document (DOCX)' },
    { value: 'image', label: 'Image' },

  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.classroomId) return setError('Please select a classroom batch');
    if (!formData.title) return setError('Please enter a title');
    if (!formData.topic) return setError('Please enter a topic');
    if (!files.length) return setError('Please select a file to upload');

    setLoading(true);

    try {
      setProgress(`Uploading ${files.length} file(s) as one resource...`);
      const data = new FormData();
      data.append('title', formData.title);
      data.append('topic', formData.topic);
      data.append('type', formData.type);
      data.append('classroomId', formData.classroomId);
      data.append('description', formData.description);
      files.forEach(file => data.append('file', file));

      await materialsAPI.create(formData.classroomId, data);
      setFiles([]);
      router.push('/admin/materials');
    } catch (err) {
      setError(err.message || 'Upload failed. Please retry.');
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px' }}>
      <button
        onClick={() => router.push('/admin/materials')}
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
          <fieldset disabled={loading} style={{ display: 'contents' }}>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, color: 'var(--color-ink)', fontSize: '14px' }}>Target Classroom (Batch)</label>
            <CustomSelect
              options={classroomOptions}
              value={formData.classroomId}
              onChange={(e) => setFormData({ ...formData, classroomId: e.target.value })}
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
              onChange={(e) => { setFormData({ ...formData, type: e.target.value }); setFiles([]); setError(''); }}
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
                {files.length ? `${files.length} file(s) selected — click to add more` : formData.type === 'image' ? 'Click to select one or more images' : 'Click to select a file'}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--color-fog)', marginTop: '4px' }}>
                {formData.type === 'image' ? 'Up to 20 images in one resource · PNG, JPG, WebP · 10 MB per image' : 'Supports PDF, PPT, Word, and Images (Max 10MB)'}
              </span>
              <input
                type="file"
                style={{ display: 'none' }}
                multiple={formData.type === 'image'}
                onChange={selectFiles}
                accept={formData.type === 'image' ? '.png,.jpg,.jpeg,.webp' : '.pdf,.docx,.pptx,.png,.jpg,.jpeg,.webp'}
              />
            </label>
            <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
              {files.map((file, index) => <li key={`${file.name}-${file.lastModified}-${index}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 12, background: '#f3f0eb', borderRadius: 8 }}>
                <span style={{ overflowWrap: 'anywhere', minWidth: 0 }}>{file.name} <small>({(file.size / 1024 / 1024).toFixed(2)} MB)</small></span>
                <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles(previous => previous.filter(item => item !== file))}>Remove</button>
              </li>)}
            </ul>
            {progress && <p role="status" aria-live="polite">{progress}</p>}
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
          </fieldset>
        </form>
      </div>
    </div>
  );
}

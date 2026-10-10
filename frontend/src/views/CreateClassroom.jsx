'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { classroomsAPI, academicAPI } from '@/services/api';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft, Check, Copy, BookOpen, FlaskConical, BookMarked,
  Plus, AlertCircle, Sparkles, Download
} from 'lucide-react';
import { copyToClipboard } from '@/utils/clipboard';

export default function CreateClassroom() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null); 

  // Form state
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState('');
  
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState('');
  
  const [offerings, setOfferings] = useState([]);
  const [offeringId, setOfferingId] = useState('');
  
  const [type, setType] = useState('theory');
  
  const [practicalGroups, setPracticalGroups] = useState([]);
  const [selectedSubBatches, setSelectedSubBatches] = useState([]);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await academicAPI.getSessions();
      if (res.success) {
        setSessions(res.data);
        const currentSession = res.data.find(s => s.isCurrent);
        if (currentSession) setSessionId(currentSession._id);
        else if (res.data.length > 0) setSessionId(res.data[0]._id);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchBatches();
    } else {
      setBatches([]);
      setBatchId('');
    }
  }, [sessionId]);

  const fetchBatches = async () => {
    try {
      const res = await academicAPI.getBatches(`academicSessionId=${sessionId}`);
      if (res.success) {
        setBatches(res.data);
        if (res.data.length > 0) setBatchId(res.data[0]._id);
        else setBatchId('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (batchId) {
      fetchOfferings();
      const selectedBatch = batches.find(b => b._id === batchId);
      setPracticalGroups(selectedBatch?.practicalGroups || []);
    } else {
      setOfferings([]);
      setOfferingId('');
      setPracticalGroups([]);
    }
  }, [batchId, batches]);

  const fetchOfferings = async () => {
    try {
      const res = await academicAPI.getOfferings(`academicSessionId=${sessionId}`);
      if (res.success) {
        const batchOfferings = res.data.filter(o => {
           const tgId = typeof o.teachingGroupId === 'object' ? o.teachingGroupId?._id : o.teachingGroupId;
           return tgId === batchId;
        });
        setOfferings(batchOfferings);
        if (batchOfferings.length > 0) setOfferingId(batchOfferings[0]._id);
        else setOfferingId('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!offeringId) {
        setError('Please select a valid course offering.');
        setSubmitting(false);
        return;
      }

      const payload = {
        courseOfferingId: offeringId,
        type,
      };

      if (type === 'lab') {
        if (selectedSubBatches.length === 0) {
          setError('Please select at least one practical group for a lab class.');
          setSubmitting(false);
          return;
        }
        payload.practicalGroupIds = selectedSubBatches;
      }

      const res = await classroomsAPI.create(payload);
      if (res.success) {
        setSuccess(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to create classroom');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSubBatch = (id) => {
    if (selectedSubBatches.includes(id)) {
      setSelectedSubBatches(selectedSubBatches.filter((x) => x !== id));
    } else {
      setSelectedSubBatches([...selectedSubBatches, id]);
    }
  };

  const previewLabBatches = practicalGroups.filter(pg => selectedSubBatches.includes(pg._id)).map(pg => pg.name);

  if (success && Array.isArray(success)) {
    return <SuccessScreen classrooms={success} />;
  }

  return (
    <div style={{ padding: '32px', maxWidth: '680px', margin: '0 auto' }}>
      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => router.push('/admin/dashboard')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          color: 'var(--color-ink)',
          cursor: 'pointer',
          fontSize: '13px',
          marginBottom: '24px',
          padding: 0,
        }}
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </motion.button>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ marginBottom: '32px' }}
      >
        <h1 style={{ color: 'var(--color-ink)', fontSize: '28px', letterSpacing: '-1px', marginBottom: '8px' }}>
          Create a Classroom
        </h1>
        <p style={{ color: 'var(--color-fog)', fontSize: '14px' }}>
          Set up a new class mapped directly to your Academic Hierarchy
        </p>
      </motion.div>

      {/* Form */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        onSubmit={handleSubmit}
        style={{
          backgroundColor: 'var(--color-paper-white)',
          borderRadius: 'var(--radius-cards)',
          padding: '32px',
          border: '1px solid var(--color-ink)',
        }}
      >
        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-cards)',
              backgroundColor: '#ffebeb',
              border: '1px solid #ff4444',
              marginBottom: '24px',
              color: '#cc0000',
              fontSize: 'var(--text-caption)',
            }}
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}

        {/* Dynamic Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
          
          {/* Session Selection */}
          <div>
            <label className="admin-label">Academic Session</label>
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="admin-input"
              required
            >
              {sessions.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Batch Selection */}
          <div>
            <label className="admin-label">Academic Batch</label>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="admin-input"
              required
            >
              <option value="">Select a Batch</option>
              {batches.map((b) => (
                <option key={b._id} value={b._id}>{b.name} ({b.programId?.code})</option>
              ))}
            </select>
            {batches.length === 0 && sessionId && (
              <p style={{ color: 'var(--color-fog)', fontSize: '12px', marginTop: '6px' }}>No batches found in this session. Go to Academic Setup to create one.</p>
            )}
          </div>

          {/* Course Offering Selection */}
          <div>
            <label className="admin-label">Course Offering / Subject</label>
            <select
              value={offeringId}
              onChange={(e) => setOfferingId(e.target.value)}
              className="admin-input"
              required
            >
              <option value="">Select an Offering</option>
              {offerings.map((o) => (
                <option key={o._id} value={o._id}>{o.courseId?.title}</option>
              ))}
            </select>
            {offerings.length === 0 && batchId && (
              <p style={{ color: 'var(--color-fog)', fontSize: '12px', marginTop: '6px' }}>No subjects assigned to this batch. Go to Academic Setup to add course offerings.</p>
            )}
          </div>
        </div>

        {/* Type Toggle */}
        <div style={{ marginBottom: '24px' }}>
          <label className="admin-label">Class Type</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <TypeToggle
              active={type === 'theory'}
              onClick={() => setType('theory')}
              icon={BookMarked}
              label="Theory"
              color="#ffde3b"
            />
            <TypeToggle
              active={type === 'lab'}
              onClick={() => setType('lab')}
              icon={FlaskConical}
              label="Lab"
              color="#ff4dd5"
            />
          </div>
        </div>

        {/* Practical Groups (only if lab) */}
        <AnimatePresence>
          {type === 'lab' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: 'hidden', marginBottom: '24px' }}
            >
              <label className="admin-label">Select Practical Sub-Batches</label>
              {practicalGroups.length === 0 ? (
                <div style={{ padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px', fontSize: '13px', color: 'var(--color-fog)' }}>
                  No practical sub-batches exist for this batch. Add them in Academic Setup.
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {practicalGroups.map((pg) => {
                    const isSelected = selectedSubBatches.includes(pg._id);
                    return (
                      <motion.button
                        key={pg._id}
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleSubBatch(pg._id)}
                        style={{
                          width: 'auto',
                          padding: '0 16px',
                          height: '48px',
                          borderRadius: 'var(--radius-cards)',
                          border: `1px solid ${isSelected ? '#ff4dd5' : 'var(--color-ink)'}`,
                          backgroundColor: isSelected ? 'rgba(255,77,213,0.12)' : 'var(--color-pure-white)',
                          color: isSelected ? '#ff4dd5' : 'var(--color-ink)',
                          fontSize: '14px',
                          fontWeight: isSelected ? 600 : 400,
                          cursor: 'pointer',
                          transition: 'all 200ms ease',
                        }}
                      >
                        {pg.name}
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Preview */}
              {previewLabBatches.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    marginTop: '12px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255,77,213,0.06)',
                    border: '1px solid rgba(255,77,213,0.1)',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ color: 'var(--color-fog)', fontSize: '12px' }}>
                    Selected Sub-batches:
                  </span>
                  {previewLabBatches.map((b) => (
                    <span key={b} style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(183,197,255,0.3)',
                      color: '#556cd6',
                      fontSize: '13px',
                    }}>
                      {b}
                    </span>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={submitting || !offeringId || (type === 'lab' && selectedSubBatches.length === 0)}
          whileTap={{ scale: 0.97 }}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 'var(--radius-buttons)',
            border: '1px solid var(--color-ink)',
            background: (submitting || !offeringId || (type === 'lab' && selectedSubBatches.length === 0))
              ? 'var(--color-paper-white)'
              : 'var(--color-sun-yellow)',
            color: 'var(--color-ink)',
            fontSize: 'var(--text-body)',
            cursor: (submitting || !offeringId || (type === 'lab' && selectedSubBatches.length === 0)) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'opacity 200ms ease',
            marginTop: '8px',
          }}
        >
          {submitting ? (
            <div className="admin-spinner-sm" />
          ) : (
            <>
              <Sparkles size={18} />
              Create Classroom & Generate QR
            </>
          )}
        </motion.button>
      </motion.form>
    </div>
  );
}

// ─── Type Toggle Button ───

function TypeToggle({ active, onClick, icon: Icon, label, color }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        flex: 1,
        padding: '16px',
        borderRadius: 'var(--radius-cards)',
        border: `1px solid ${active ? color : 'var(--color-ink)'}`,
        backgroundColor: active ? `${color}15` : 'var(--color-pure-white)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 200ms ease',
      }}
    >
      <Icon size={24} color={active ? color : 'var(--color-fog)'} strokeWidth={1.8} />
      <span style={{
        fontSize: '14px',
        color: active ? color : 'var(--color-ink)',
      }}>
        {label}
      </span>
      {active && (
        <motion.div
          layoutId="typeIndicator"
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: color,
          }}
        />
      )}
    </motion.button>
  );
}

// ─── Success Screen ───

function SuccessScreen({ classrooms }) {
  const [copiedIndex, setCopiedIndex] = useState(null);
  const router = useRouter();

  const getEnrollUrl = (classroom) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/enroll/${classroom.enrollmentToken}`;
  };

  const copyUrl = (classroom, index) => {
    copyToClipboard(getEnrollUrl(classroom));
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const downloadQR = (classroom, index) => {
    const svgEl = document.querySelector(`#qr-code-${index} svg`);
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const link = document.createElement('a');
      const label = classroom.practicalGroupId?.name || classroom.type || 'classroom';
      link.download = `qr-enroll-${label}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const isMultiple = classrooms.length > 1;
  const courseName = classrooms[0]?.courseId?.title || 'Course';
  const type = classrooms[0]?.type;
  const session = classrooms[0]?.session;

  return (
    <div style={{ padding: '32px', maxWidth: '720px', margin: '0 auto' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        style={{
          textAlign: 'center',
          backgroundColor: 'var(--color-paper-white)',
          borderRadius: 'var(--radius-cards)',
          padding: '48px 32px',
          border: '1px solid var(--color-ink)',
          marginTop: '60px',
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 20 }}
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #c1f32b, #ffde3b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}
        >
          <Check size={36} color="var(--color-ink)" strokeWidth={3} />
        </motion.div>

        <h2 style={{ color: 'var(--color-ink)', fontSize: '24px', letterSpacing: '-0.8px', marginBottom: '8px' }}>
          {isMultiple ? 'Classrooms Created!' : 'Classroom Created!'}
        </h2>
        <p style={{ color: 'var(--color-fog)', fontSize: '14px', marginBottom: '32px' }}>
          Share {isMultiple ? 'these QR codes' : 'this QR code'} with your students to scan and enroll
        </p>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '32px',
        }}>
          <span className="admin-badge">{session}</span>
          <span className="admin-badge" style={{
            backgroundColor: type === 'lab' ? 'rgba(255,77,213,0.12)' : 'rgba(255,222,59,0.12)',
            color: type === 'lab' ? '#ff4dd5' : '#ffde3b',
          }}>
            {type === 'lab' ? '🔬 Lab' : '📖 Theory'}
          </span>
        </div>

        <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: isMultiple ? '1fr 1fr' : '1fr', marginBottom: '32px' }}>
          {classrooms.map((c, i) => (
            <motion.div
              key={c._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + (i * 0.1) }}
              style={{
                padding: '28px 24px',
                borderRadius: 'var(--radius-cards)',
                backgroundColor: 'var(--color-pure-white)',
                border: '1px solid var(--color-ink)',
                boxShadow: '4px 4px 0px var(--color-ink)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div id={`qr-code-${i}`} style={{
                padding: '12px',
                backgroundColor: '#fff',
                borderRadius: '12px',
                marginBottom: '16px',
              }}>
                <QRCodeSVG
                  value={getEnrollUrl(c)}
                  size={isMultiple ? 160 : 200}
                  level="M"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => copyUrl(c, i)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-ink)',
                    backgroundColor: copiedIndex === i ? 'var(--color-lime-burst)' : 'var(--color-paper-white)',
                    color: 'var(--color-ink)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    transition: 'background-color 0.2s ease',
                  }}
                >
                  {copiedIndex === i ? <Check size={13} /> : <Copy size={13} />}
                  {copiedIndex === i ? 'Copied!' : 'Copy Link'}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => downloadQR(c, i)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-ink)',
                    backgroundColor: 'var(--color-sun-yellow)',
                    color: 'var(--color-ink)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  <Download size={13} /> Save QR
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/admin/dashboard')}
            style={{
              padding: '12px 24px',
              borderRadius: 'var(--radius-buttons)',
              border: '1px solid var(--color-ink)',
              backgroundColor: 'var(--color-pure-white)',
              color: 'var(--color-ink)',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Go to Dashboard
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (classrooms.length === 1) {
                router.push(`/admin/classrooms/${classrooms[0]._id}`);
              } else {
                router.push('/admin/dashboard');
              }
            }}
            style={{
              padding: '12px 24px',
              borderRadius: 'var(--radius-buttons)',
              border: '1px solid var(--color-ink)',
              background: 'var(--color-sun-yellow)',
              color: 'var(--color-ink)',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {isMultiple ? 'Done' : 'View Classroom'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

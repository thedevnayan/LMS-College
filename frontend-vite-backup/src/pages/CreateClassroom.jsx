import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { classroomsAPI, coursesAPI } from '../services/api';
import {
  ArrowLeft, Check, Copy, BookOpen, FlaskConical, BookMarked,
  Plus, AlertCircle, Sparkles
} from 'lucide-react';

// Generate session options: current and next 2 academic years
function getSessionOptions() {
  const now = new Date();
  const year = now.getFullYear();
  // If month >= June, current session starts this year
  const startYear = now.getMonth() >= 5 ? year : year - 1;
  const sessions = [];
  for (let i = -1; i <= 2; i++) {
    const y = startYear + i;
    sessions.push(`${y}-${y + 1}`);
  }
  return sessions;
}

export default function CreateClassroom() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null); // holds created classroom data

  // Form state
  const [courseId, setCourseId] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [session, setSession] = useState(getSessionOptions()[1]); // default to current session
  const [classBatch, setClassBatch] = useState('');
  const [type, setType] = useState('theory');
  const [selectedSubBatches, setSelectedSubBatches] = useState([1, 2]);

  const sessions = getSessionOptions();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await coursesAPI.list('limit=100');
      if (res.success) {
        setCourses(res.data);
        if (res.data.length > 0) {
          setCourseId(res.data[0]._id);
        } else {
          setShowNewCourse(true);
        }
      }
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      let finalCourseId = courseId;

      // If creating a new course
      if (showNewCourse) {
        if (!newCourseName.trim()) {
          setError('Course name is required');
          setSubmitting(false);
          return;
        }
        const courseRes = await coursesAPI.create({ title: newCourseName.trim() });
        if (courseRes.success) {
          finalCourseId = courseRes.data._id;
        }
      }

      if (!finalCourseId) {
        setError('Please select or create a course');
        setSubmitting(false);
        return;
      }

      const payload = {
        courseId: finalCourseId,
        session,
        classBatch: classBatch.toUpperCase(),
        type,
      };

      if (type === 'lab') {
        if (selectedSubBatches.length === 0) {
          setError('Please select at least one lab sub-batch');
          setSubmitting(false);
          return;
        }
        payload.labBatches = selectedSubBatches.map(n => `${classBatch.toUpperCase()}${n}`);
      }

      const res = await classroomsAPI.create(payload);
      if (res.success) {
        setSuccess(res.data); // now returns an array
      }
    } catch (err) {
      setError(err.message || 'Failed to create classroom');
    } finally {
      setSubmitting(false);
    }
  };

  // Preview lab batches
  const previewLabBatches = type === 'lab' && classBatch
    ? selectedSubBatches.map(n => `${classBatch.toUpperCase()}${n}`)
    : [];

  const toggleSubBatch = (n) => {
    if (selectedSubBatches.includes(n)) {
      setSelectedSubBatches(selectedSubBatches.filter((x) => x !== n));
    } else {
      setSelectedSubBatches([...selectedSubBatches, n].sort());
    }
  };

  // Success screen
  if (success && Array.isArray(success)) {
    return <SuccessScreen classrooms={success} navigate={navigate} />;
  }

  return (
    <div style={{ padding: '32px', maxWidth: '680px', margin: '0 auto' }}>
      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate('/admin/dashboard')}
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
          Set up a new class — a unique 6-digit code will be generated for students to join
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

        {/* Course Selection */}
        <div style={{ marginBottom: '24px' }}>
          <label className="admin-label">Course</label>
          {loadingCourses ? (
            <div style={{ padding: '12px', color: 'rgba(255,255,255,0.3)' }}>Loading courses...</div>
          ) : (
            <>
              {!showNewCourse ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="admin-input"
                    style={{ flex: 1 }}
                  >
                    {courses.map((c) => (
                      <option key={c._id} value={c._id}>{c.title}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewCourse(true)}
                    className="admin-btn-outline"
                    style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={14} /> New
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    placeholder="e.g. Data Structures & Algorithms"
                    className="admin-input"
                    style={{ flex: 1 }}
                  />
                  {courses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCourse(false);
                        setNewCourseName('');
                      }}
                      className="admin-btn-outline"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Session */}
        <div style={{ marginBottom: '24px' }}>
          <label className="admin-label">Academic Session</label>
          <select
            value={session}
            onChange={(e) => setSession(e.target.value)}
            className="admin-input"
          >
            {sessions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Class Batch */}
        <div style={{ marginBottom: '24px' }}>
          <label className="admin-label">Class Batch</label>
          <input
            type="text"
            value={classBatch}
            onChange={(e) => setClassBatch(e.target.value.toUpperCase())}
            placeholder="e.g. A, B, C"
            className="admin-input"
            maxLength={5}
            required
          />
          <p className="admin-hint">
            The section or batch identifier for this class
          </p>
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

        {/* Lab Batch Count (only if lab) */}
        <AnimatePresence>
          {type === 'lab' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: 'hidden', marginBottom: '24px' }}
            >
              <label className="admin-label">Select Lab Sub-Batches</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const isSelected = selectedSubBatches.includes(n);
                  return (
                    <motion.button
                      key={n}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleSubBatch(n)}
                      style={{
                        width: 'auto',
                        padding: '0 16px',
                        height: '48px',
                        borderRadius: 'var(--radius-cards)',
                        border: `1px solid ${isSelected ? '#ff4dd5' : 'var(--color-ink)'}`,
                        backgroundColor: isSelected ? 'rgba(255,77,213,0.12)' : 'var(--color-pure-white)',
                        color: isSelected ? '#ff4dd5' : 'var(--color-ink)',
                        fontSize: '16px',
                        fontWeight: isSelected ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 200ms ease',
                      }}
                    >
                      {classBatch ? `${classBatch.toUpperCase()}${n}` : `Batch ${n}`}
                    </motion.button>
                  );
                })}
              </div>

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
                    Sub-batches:
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
          disabled={submitting || !classBatch}
          whileTap={{ scale: 0.97 }}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 'var(--radius-buttons)',
            border: '1px solid var(--color-ink)',
            background: (submitting || !classBatch)
              ? 'var(--color-paper-white)'
              : 'var(--color-sun-yellow)',
            color: 'var(--color-ink)',
            fontSize: 'var(--text-body)',
            cursor: (submitting || !classBatch) ? 'not-allowed' : 'pointer',
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
              Create Classroom & Generate Code
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

function SuccessScreen({ classrooms, navigate }) {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const copyCode = (code, index) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const isMultiple = classrooms.length > 1;
  const courseName = classrooms[0]?.courseId?.title || 'Course';
  const type = classrooms[0]?.type;
  const session = classrooms[0]?.session;
  const classBatch = classrooms[0]?.classBatch;

  return (
    <div style={{ padding: '32px', maxWidth: '680px', margin: '0 auto' }}>
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
        {/* Success icon */}
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
          Share {isMultiple ? 'these codes' : 'this code'} with your students to join
        </p>

        {/* Classroom details */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '32px',
        }}>
          <span className="admin-badge">{session}</span>
          <span className="admin-badge">Batch {classBatch}</span>
          <span className="admin-badge" style={{
            backgroundColor: type === 'lab' ? 'rgba(255,77,213,0.12)' : 'rgba(255,222,59,0.12)',
            color: type === 'lab' ? '#ff4dd5' : '#ffde3b',
          }}>
            {type === 'lab' ? '🔬 Lab' : '📖 Theory'}
          </span>
        </div>

        {/* Big Join Codes */}
        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: isMultiple ? '1fr 1fr' : '1fr', marginBottom: '32px' }}>
          {classrooms.map((c, i) => (
            <motion.div
              key={c._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + (i * 0.1) }}
              style={{
                padding: '24px',
                borderRadius: 'var(--radius-cards)',
                backgroundColor: 'var(--color-pure-white)',
                border: '1px solid var(--color-ink)',
                boxShadow: '4px 4px 0px var(--color-ink)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              {c.type === 'lab' && c.labBatch && (
                <div style={{ 
                  marginBottom: '12px', 
                  color: '#ff4dd5', 
                  fontWeight: 600, 
                  fontSize: '14px',
                  backgroundColor: 'rgba(255,77,213,0.12)',
                  padding: '4px 12px',
                  borderRadius: '6px'
                }}>
                  {c.labBatch}
                </div>
              )}
              <div style={{
                fontFamily: 'monospace',
                fontSize: isMultiple ? '36px' : '48px',
                letterSpacing: isMultiple ? '8px' : '12px',
                color: 'var(--color-ink)',
                fontWeight: 700,
                marginBottom: '16px',
                textAlign: 'center',
              }}>
                {c.joinCode}
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => copyCode(c.joinCode, i)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-ink)',
                  backgroundColor: 'var(--color-paper-white)',
                  color: 'var(--color-ink)',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                {copiedIndex === i ? <Check size={14} /> : <Copy size={14} />}
                {copiedIndex === i ? 'Copied!' : 'Copy Code'}
              </motion.button>
            </motion.div>
          ))}
        </div>



        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/admin/dashboard')}
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
                navigate(`/admin/classrooms/${classrooms[0]._id}`);
              } else {
                navigate('/admin/dashboard');
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

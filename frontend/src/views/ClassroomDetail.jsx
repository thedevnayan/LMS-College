'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { classroomsAPI } from '@/services/api';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft, Copy, Check, Users, RefreshCw, Trash2,
  FlaskConical, BookMarked, Calendar, AlertCircle, UserCircle, Download
} from 'lucide-react';
import { copyToClipboard } from '@/utils/clipboard';

export default function ClassroomDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [classroom, setClassroom] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchClassroom();
    fetchStudents();
  }, [id]);

  const fetchClassroom = async () => {
    try {
      const res = await classroomsAPI.getById(id);
      if (res.success) {
        setClassroom(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch classroom:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await classroomsAPI.getStudents(id, 'limit=100');
      if (res.success) {
        setStudents(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
    }
  };

  const getEnrollUrl = () => {
    if (!classroom) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/enroll/${classroom.enrollmentToken}`;
  };

  const copyEnrollUrl = () => {
    if (!classroom) return;
    copyToClipboard(getEnrollUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    const svgEl = document.querySelector('#classroom-qr-code svg');
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
      link.download = `qr-enroll-${classroom.classBatch || 'class'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await classroomsAPI.regenerateCode(id);
      if (res.success) {
        setClassroom((prev) => ({ ...prev, joinCode: res.data.joinCode, enrollmentToken: res.data.enrollmentToken }));
      }
    } catch (err) {
      console.error('Failed to regenerate QR:', err);
    } finally {
      setRegenerating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await classroomsAPI.delete(id);
      router.push('/admin/dashboard');
    } catch (err) {
      console.error('Failed to delete classroom:', err);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
      }}>
        <div className="admin-spinner" />
      </div>
    );
  }

  if (!classroom) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <AlertCircle size={48} color="var(--color-fog)" style={{ marginBottom: '16px' }} />
        <h2 style={{ color: 'var(--color-ink)' }}>Classroom not found</h2>
        <button
          onClick={() => router.push('/admin/dashboard')}
          style={{
            marginTop: '16px',
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid var(--color-ink)',
            backgroundColor: 'var(--color-pure-white)',
            color: 'var(--color-ink)',
            cursor: 'pointer',
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Back */}
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

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ color: 'var(--color-ink)', fontSize: '28px', letterSpacing: '-1px', marginBottom: '8px' }}>
            {classroom.courseId?.title || 'Classroom'}
          </h1>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="admin-badge" style={{
              backgroundColor: classroom.type === 'lab'
                ? 'rgba(255,77,213,0.15)' : 'rgba(255,222,59,0.25)',
              color: 'var(--color-ink)',
            }}>
              {classroom.type === 'lab' ? '🔬 Lab' : '📖 Theory'}
            </span>
            <span className="admin-badge">Batch {classroom.classBatch}</span>
            <span className="admin-badge">{classroom.session}</span>
            {classroom.type === 'lab' && classroom.labBatch && (
              <span className="admin-badge" style={{
                backgroundColor: 'rgba(255,77,213,0.15)',
                color: 'var(--color-ink)',
              }}>
                Sub-batch {classroom.labBatch}
              </span>
            )}
            <span className="admin-badge" style={{
              backgroundColor: 'rgba(193,243,43,0.25)',
              color: 'var(--color-ink)',
            }}>
              <Users size={12} style={{ marginRight: '4px' }} />
              {classroom.studentCount || 0} Students
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid rgba(211,47,47,0.3)',
            backgroundColor: 'rgba(211,47,47,0.08)',
            color: '#d32f2f',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          <Trash2 size={14} />
          Delete
        </button>
      </motion.div>

      {/* QR Code Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        style={{
          backgroundColor: 'var(--color-paper-white)',
          borderRadius: 'var(--radius-cards)',
          padding: '32px',
          border: '1px solid var(--color-ink)',
          marginBottom: '24px',
          textAlign: 'center',
        }}
      >
        <div style={{ color: 'var(--color-fog)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px' }}>
          Student Enrollment QR
        </div>
        <div id="classroom-qr-code" style={{
          display: 'inline-block',
          padding: '16px',
          backgroundColor: '#fff',
          borderRadius: '16px',
          border: '1px solid var(--color-stone)',
          marginBottom: '20px',
        }}>
          <QRCodeSVG
            value={getEnrollUrl()}
            size={200}
            level="M"
            includeMargin={true}
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={copyEnrollUrl}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid var(--color-ink)',
              backgroundColor: copied ? 'var(--color-lime-burst)' : 'var(--color-pure-white)',
              color: 'var(--color-ink)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'background-color 0.2s ease',
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={downloadQR}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid var(--color-ink)',
              backgroundColor: 'var(--color-sun-yellow)',
              color: 'var(--color-ink)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <Download size={14} />
            Save QR
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleRegenerate}
            disabled={regenerating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid var(--color-ink)',
              backgroundColor: 'var(--color-pure-white)',
              color: 'var(--color-ink)',
              cursor: regenerating ? 'wait' : 'pointer',
              fontSize: '13px',
            }}
          >
            <RefreshCw size={14} className={regenerating ? 'admin-spin' : ''} />
            Regenerate QR
          </motion.button>
        </div>
      </motion.div>



      {/* Students List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        style={{
          backgroundColor: 'var(--color-paper-white)',
          borderRadius: 'var(--radius-cards)',
          padding: '24px',
          border: '1px solid var(--color-ink)',
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}>
          <h3 style={{ color: 'var(--color-ink)', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} color="var(--color-ink)" />
            Enrolled Students ({students.length})
          </h3>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={fetchStudents}
            style={{
              padding: '6px',
              borderRadius: '6px',
              border: '1px solid var(--color-ink)',
              backgroundColor: 'var(--color-pure-white)',
              color: 'var(--color-ink)',
              cursor: 'pointer',
              display: 'flex',
            }}
          >
            <RefreshCw size={14} />
          </motion.button>
        </div>

        {students.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: 'var(--color-fog)',
          }}>
            <Users size={40} color="var(--color-fog)" style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p style={{ fontSize: '14px' }}>No students have joined yet</p>
            <p style={{ fontSize: '12px', color: 'var(--color-fog)', marginTop: '4px' }}>
              Share the join code with your students
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: classroom.type === 'lab' ? '1fr 2fr 2fr 1fr 1.5fr' : '1fr 2fr 2fr 1.5fr',
              padding: '8px 16px',
              color: 'var(--color-fog)',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              <span>#</span>
              <span>Name</span>
              <span>Email</span>
              {classroom.type === 'lab' && <span>Lab Batch</span>}
              <span>Joined</span>
            </div>
            {students.map((student, i) => (
              <motion.div
                key={student.studentId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: classroom.type === 'lab' ? '1fr 2fr 2fr 1fr 1.5fr' : '1fr 2fr 2fr 1.5fr',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: i % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent',
                  alignItems: 'center',
                  fontSize: '13px',
                }}
              >
                <span style={{ color: 'var(--color-fog)' }}>{i + 1}</span>
                <span style={{ color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, hsl(${(i * 60) % 360}, 60%, 70%), hsl(${(i * 60 + 40) % 360}, 60%, 50%))`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    color: '#fff',
                    flexShrink: 0,
                  }}>
                    {student.name?.charAt(0)?.toUpperCase()}
                  </div>
                  {student.name}
                </span>
                <span style={{ color: 'var(--color-fog)' }}>{student.email}</span>
                {classroom.type === 'lab' && (
                  <span style={{
                    color: student.labBatch ? '#556cd6' : 'var(--color-fog)',
                    fontSize: '12px',
                  }}>
                    {student.labBatch || 'Unassigned'}
                  </span>
                )}
                <span style={{ color: 'var(--color-fog)', fontSize: '12px' }}>
                  {student.enrolledAt ? new Date(student.enrolledAt).toLocaleDateString() : '-'}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '24px',
            }}
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'var(--color-pure-white)',
                borderRadius: 'var(--radius-cards)',
                padding: '32px',
                maxWidth: '420px',
                width: '100%',
                border: '1px solid var(--color-ink)',
                boxShadow: '4px 4px 0px var(--color-ink)',
              }}
            >
              <h3 style={{ color: 'var(--color-ink)', fontSize: '18px', marginBottom: '12px' }}>
                Delete Classroom?
              </h3>
              <p style={{ color: 'var(--color-fog)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
                This will remove the classroom and its join code. Students already enrolled in the course will not be removed.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-ink)',
                    backgroundColor: 'var(--color-paper-white)',
                    color: 'var(--color-ink)',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#ff4444',
                    color: 'var(--color-pure-white)',
                    cursor: deleting ? 'wait' : 'pointer',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {deleting ? <div className="admin-spinner-sm" /> : <Trash2 size={14} />}
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useAcademic } from '@/context/AcademicContext';
import { classroomsAPI } from '@/services/api';
import { QRCodeSVG } from 'qrcode.react';
import {
  Plus, Copy, Check, Users, BookOpen, Calendar,
  FlaskConical, BookMarked, ChevronRight, RefreshCw, Search, Zap, QrCode, Link2, ToggleLeft, ToggleRight, UserPlus, X
} from 'lucide-react';
import { toast } from 'sonner';
import { copyToClipboard } from '@/utils/clipboard';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { activeSession } = useAcademic();
  const router = useRouter();
  const [classrooms, setClassrooms] = useState([]);
  const [batchCodes, setBatchCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [qrModal, setQrModal] = useState(null);
  const [createTeacherModal, setCreateTeacherModal] = useState(false);
  const [teacherForm, setTeacherForm] = useState({ name: '', email: '', password: '', role: 'professor' });
  const [creatingTeacher, setCreatingTeacher] = useState(false);

  useEffect(() => {
    fetchClassrooms();
    fetchBatchCodes();
  }, [activeSession]);

  const fetchClassrooms = async () => {
    setLoading(true);
    try {
      const res = await classroomsAPI.list('limit=100');
      if (res.success) {
        setClassrooms(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch classrooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchCodes = async () => {
    try {
      const res = await classroomsAPI.getBatchCodes(activeSession?.name);
      if (res.success) {
        setBatchCodes(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch batch codes:', err);
    }
  };

  const copyEnrollLink = (enrollmentToken) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/enroll/${enrollmentToken}`;
    copyToClipboard(url);
    setCopiedCode(enrollmentToken);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const copyCode = (code) => {
    copyToClipboard(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleBatchLogin = async (id, currentState) => {
    try {
      const res = await fetch(`http://localhost:5000/api/classrooms/batch-codes/${id}/toggle-login`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchBatchCodes(); // Refresh to get updated state
      } else {
        toast.error(data.error?.message || 'Failed to toggle login');
      }
    } catch (err) {
      toast.error('Failed to toggle login access');
    }
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    setCreatingTeacher(true);
    try {
      const res = await fetch(`http://localhost:5000/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(teacherForm)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Successfully created credentials for ${teacherForm.name}`);
        setCreateTeacherModal(false);
        setTeacherForm({ name: '', email: '', password: '', role: 'professor' });
      } else {
        toast.error(data.error?.message || 'Failed to create teacher');
      }
    } catch (err) {
      toast.error('Failed to create teacher');
    } finally {
      setCreatingTeacher(false);
    }
  };

  // Stats
  const totalStudents = classrooms.reduce((acc, c) => acc + (c.studentCount || 0), 0);
  const activeSessions = [...new Set(classrooms.map((c) => c.session))].length;
  const labCount = classrooms.filter((c) => c.type === 'lab').length;
  const theoryCount = classrooms.filter((c) => c.type === 'theory').length;

  const filteredClassrooms = classrooms.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const courseName = c.courseId?.title || '';
    return (
      c.classBatch.toLowerCase().includes(q) ||
      c.session.toLowerCase().includes(q) ||
      courseName.toLowerCase().includes(q)
    );
  });

  const stats = [
    { label: 'Total Classes', value: classrooms.length, icon: BookOpen, color: '#ffde3b' },
    { label: 'Total Students', value: totalStudents, icon: Users, color: '#b7c5ff' },
    { label: 'Active Sessions', value: activeSessions, icon: Calendar, color: '#c1f32b' },
    { label: 'Lab / Theory', value: `${labCount} / ${theoryCount}`, icon: FlaskConical, color: '#ff4dd5' },
  ];

  const staggerChild = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.08, duration: 0.5, ease: [0.23, 1, 0.32, 1] },
    }),
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
        }}
      >
        <div>
          <h1 style={{ color: 'var(--color-ink)', fontSize: '28px', letterSpacing: '-1px', marginBottom: '4px' }}>
            Welcome back, {user?.name?.split(' ')[0] || 'Professor'}
          </h1>
          <p style={{ color: 'var(--color-fog)', fontSize: '14px' }}>
            Manage your classrooms and track students
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {user?.role === 'admin' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setCreateTeacherModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                borderRadius: '10px',
                border: '1px solid var(--color-ink)',
                background: 'var(--color-paper-white)',
                color: 'var(--color-ink)',
                fontSize: 'var(--text-body)',
                cursor: 'pointer',
              }}
            >
              <UserPlus size={18} />
              Create Teacher
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/admin/classrooms/new')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: '10px',
              background: 'var(--color-sun-yellow)',
              color: 'var(--color-ink)',
              fontSize: 'var(--text-body)',
              border: '1px solid var(--color-ink)',
              cursor: 'pointer',
            }}
          >
            <Plus size={18} />
            New Classroom
          </motion.button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '36px',
      }}>
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={staggerChild}
            style={{
              backgroundColor: 'var(--color-paper-white)',
              borderRadius: 'var(--radius-cards)',
              padding: '24px',
              border: '1px solid var(--color-ink)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '2px 2px 0px var(--color-ink)',
            }}
          >
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: `${stat.color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <stat.icon size={22} color={stat.color} strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ color: 'var(--color-fog)', fontSize: '12px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {stat.label}
              </div>
              <div style={{ color: 'var(--color-ink)', fontSize: '24px', letterSpacing: '-0.8px' }}>
                {stat.value}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ─── SINGLE-CODE BATCH ONBOARDING SECTION ─── */}
      {batchCodes.length > 0 && (
        <div style={{
          backgroundColor: 'var(--color-paper-white)',
          borderRadius: '16px',
          border: '2px solid var(--color-ink)',
          padding: '24px',
          boxShadow: '4px 4px 0 var(--color-ink)',
          marginBottom: '32px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Zap size={18} color="var(--color-ink)" fill="var(--color-sun-yellow)" />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-ink)', margin: 0 }}>
                  Batch Join Codes
                </h3>
              </div>
              <p style={{ color: 'var(--color-fog)', fontSize: '13px', margin: 0 }}>
                One code to join all theory & lab classes for a batch.
              </p>
            </div>
          </div>

          {/* Batch Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {batchCodes.map((b) => (
              <div
                key={`${b.session}-${b.classBatch}`}
                style={{
                  backgroundColor: 'var(--color-warm-linen)',
                  borderRadius: '12px',
                  border: '1.5px solid var(--color-ink)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-ink)' }}>
                      Batch {b.classBatch}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--color-fog)', marginLeft: '8px' }}>
                      Session {b.session}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--color-paper-white)', border: '1px solid var(--color-ink)' }}>
                    {b.theoryClassesCount + b.labClassesCount} Classes Total
                  </span>
                </div>

                {/* Sub-Batches / Direct Lab Codes (Fastest Onboarding) */}
                {b.subBatches && b.subBatches.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <FlaskConical size={12} /> Lab Groups
                    </div>
                    {b.subBatches.map((sb) => (
                      <div
                        key={sb.code}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          backgroundColor: 'var(--color-paper-white)',
                          borderRadius: '8px',
                          border: '1px solid var(--color-ink)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(255,77,213,0.15)',
                            border: '1px solid var(--color-ink)',
                            fontSize: '11px',
                            fontWeight: 800,
                          }}>
                            Lab {sb.labBatch}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--color-fog)', fontWeight: 600 }}>
                            {sb.totalClassesCount} Classes
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => copyCode(sb.code)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--color-ink)',
                            backgroundColor: copiedCode && copiedCode === sb.code ? 'var(--color-spring-green)' : 'var(--color-sun-yellow)',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            boxShadow: '1px 1px 0 var(--color-ink)',
                          }}
                        >
                          <span style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>{sb.code}</span>
                          {copiedCode && copiedCode === sb.code ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Master Batch Code & Login Toggle */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  backgroundColor: 'var(--color-paper-white)',
                  borderRadius: '8px',
                  border: '1px dashed var(--color-ink)',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <BookOpen size={14} color="var(--color-fog)" />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-ink)' }}>
                        Master Code
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleBatchLogin(b.masterCodeId, b.loginEnabled)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '4px 8px', borderRadius: '6px',
                        backgroundColor: b.loginEnabled ? '#dcfce7' : '#fee2e2',
                        border: `1px solid ${b.loginEnabled ? '#16a34a' : '#dc2626'}`,
                        color: b.loginEnabled ? '#166534' : '#991b1b',
                        fontSize: '11px', fontWeight: 800, cursor: 'pointer',
                      }}
                    >
                      {b.loginEnabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      {b.loginEnabled ? 'Login Enabled' : 'Login Revoked'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => copyCode(b.masterCode)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-ink)',
                        backgroundColor: copiedCode && copiedCode === b.masterCode ? 'var(--color-spring-green)' : 'var(--color-warm-linen)',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '1px 1px 0 var(--color-ink)',
                      }}
                    >
                      <span style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>{b.masterCode}</span>
                      {copiedCode && copiedCode === b.masterCode ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Classrooms Section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
      }}>
        <h2 style={{ color: 'var(--color-ink)', fontSize: '18px', letterSpacing: '-0.5px' }}>
          Your Classrooms
        </h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Search */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '10px',
            backgroundColor: 'var(--color-pure-white)',
            border: '1px solid var(--color-ink)',
          }}>
            <Search size={16} color="var(--color-fog)" />
            <input
              type="text"
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'none',
                color: 'var(--color-ink)',
                fontSize: '13px',
                outline: 'none',
                width: '140px',
              }}
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={fetchClassrooms}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid var(--color-ink)',
              backgroundColor: 'var(--color-pure-white)',
              color: 'var(--color-ink)',
              cursor: 'pointer',
              display: 'flex',
            }}
          >
            <RefreshCw size={16} />
          </motion.button>
        </div>
      </div>

      {/* Classroom Cards */}
      {loading ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '80px 0',
        }}>
          <div className="admin-spinner" />
        </div>
      ) : filteredClassrooms.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            textAlign: 'center',
            padding: '80px 40px',
            backgroundColor: 'var(--color-paper-white)',
            borderRadius: 'var(--radius-cards)',
            border: '1px solid var(--color-ink)',
          }}
        >
          <BookMarked size={48} color="var(--color-fog)" style={{ marginBottom: '16px' }} />
          <h3 style={{ color: 'var(--color-ink)', fontSize: '18px', marginBottom: '8px' }}>
            {searchQuery ? 'No classes match your search' : 'No classrooms yet'}
          </h3>
          <p style={{ color: 'var(--color-fog)', fontSize: '14px', marginBottom: '24px' }}>
            {searchQuery ? 'Try a different search term' : 'Create your first classroom to get started'}
          </p>
          {!searchQuery && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/admin/classrooms/new')}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: '1px solid var(--color-ink)',
                background: 'var(--color-sun-yellow)',
                color: 'var(--color-ink)',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Plus size={18} />
              Create Classroom
            </motion.button>
          )}
        </motion.div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '16px',
        }}>
            <AnimatePresence>
              {Object.values(filteredClassrooms.reduce((acc, c) => {
                const key = c.type === 'lab' ? `${c.courseId?._id}-${c.session}-${c.classBatch}-${c.type}` : c._id;
                if (!acc[key]) {
                  acc[key] = {
                    ...c,
                    idKey: key,
                    totalStudents: c.studentCount || 0,
                    subBatches: c.type === 'lab' && c.labBatch ? [{
                      _id: c._id,
                      labBatch: c.labBatch,
                      enrollmentToken: c.enrollmentToken,
                      studentCount: c.studentCount || 0
                    }] : []
                  };
                } else {
                  if (c.labBatch) {
                    acc[key].subBatches.push({
                      _id: c._id,
                      labBatch: c.labBatch,
                      enrollmentToken: c.enrollmentToken,
                      studentCount: c.studentCount || 0
                    });
                  }
                  acc[key].totalStudents += (c.studentCount || 0);
                }
                return acc;
              }, {})).map((group, i) => (
                <motion.div
                  key={group.idKey}
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  variants={staggerChild}
                  layout
                  style={{
                    backgroundColor: 'var(--color-paper-white)',
                    borderRadius: 'var(--radius-cards)',
                    border: '1px solid var(--color-ink)',
                    overflow: 'hidden',
                    cursor: group.type === 'theory' ? 'pointer' : 'default',
                    transition: 'box-shadow 200ms ease',
                  }}
                  onClick={() => group.type === 'theory' && router.push(`/admin/classrooms/${group._id}`)}
                  onMouseEnter={(e) => group.type === 'theory' && (e.currentTarget.style.boxShadow = '4px 4px 0px var(--color-ink)')}
                  onMouseLeave={(e) => group.type === 'theory' && (e.currentTarget.style.boxShadow = 'none')}
                >
                  {/* Top color bar */}
                  <div style={{
                    height: '4px',
                    background: group.type === 'lab'
                      ? 'linear-gradient(90deg, #ff4dd5, #b7c5ff)'
                      : 'linear-gradient(90deg, #ffde3b, #c1f32b)',
                  }} />

                  <div style={{ padding: '20px' }}>
                    {/* Header */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: group.type === 'lab' ? '8px' : '16px',
                    }}>
                      <div>
                        <div style={{
                          color: 'var(--color-ink)',
                          fontSize: '16px',
                          letterSpacing: '-0.3px',
                          marginBottom: '4px',
                          fontWeight: 600,
                        }}>
                          {group.courseId?.title || 'Untitled Course'}
                        </div>
                        <div style={{
                          display: 'flex',
                          gap: '6px',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                        }}>
                          <span className="admin-badge" style={{
                            backgroundColor: group.type === 'lab'
                              ? 'rgba(255,77,213,0.15)' : 'rgba(255,222,59,0.25)',
                            color: 'var(--color-ink)',
                          }}>
                            {group.type === 'lab' ? '🔬 Lab' : '📖 Theory'}
                          </span>
                          <span className="admin-badge">
                            Batch {group.classBatch}
                          </span>
                          <span className="admin-badge">
                            {group.session}
                          </span>
                        </div>
                      </div>
                      {group.type === 'theory' && <ChevronRight size={18} color="var(--color-fog)" />}
                    </div>

                    {/* Body */}
                    {group.type === 'lab' ? (
                      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {group.subBatches.sort((a, b) => a.labBatch.localeCompare(b.labBatch)).map(sb => (
                          <div 
                            key={sb._id}
                            onClick={(e) => { e.stopPropagation(); router.push(`/admin/classrooms/${sb._id}`); }}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px',
                              borderRadius: '8px',
                              backgroundColor: 'rgba(0,0,0,0.02)',
                              border: '1px solid rgba(0,0,0,0.05)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)';
                              e.currentTarget.style.borderColor = 'rgba(255,77,213,0.3)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)';
                              e.currentTarget.style.borderColor = 'rgba(0,0,0,0.05)';
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(255,77,213,0.15)',
                                color: 'var(--color-ink)',
                                fontSize: '11px',
                                fontWeight: 600,
                              }}>
                                {sb.labBatch}
                              </span>
                              <span
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                                  padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
                                  backgroundColor: 'rgba(0,0,0,0.04)',
                                  color: 'var(--color-ink)',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQrModal({
                                    token: sb.enrollmentToken,
                                    title: group.courseId?.title || 'Untitled Course',
                                    subtitle: `Batch ${group.classBatch} — Lab ${sb.labBatch}`,
                                  });
                                }}
                              >
                                <QrCode size={12} />
                                Enroll
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-fog)', fontSize: '12px' }}>
                              <Users size={12} />
                              {sb.studentCount}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: '16px',
                        borderTop: '1px solid var(--color-ink)',
                      }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setQrModal({
                              token: group.enrollmentToken,
                              title: group.courseId?.title || 'Untitled Course',
                              subtitle: `Batch ${group.classBatch} — Theory`,
                            });
                          }}
                        >
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(0,0,0,0.04)',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--color-ink)',
                            transition: 'background-color 0.2s ease',
                          }}>
                            <QrCode size={14} />
                            Enroll
                          </span>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: 'var(--color-fog)',
                          fontSize: '13px',
                        }}>
                          <Users size={14} />
                          {group.totalStudents}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      )}

      {/* QR Code Modal */}
      <AnimatePresence>
        {qrModal && (
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
            onClick={() => setQrModal(null)}
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
                maxWidth: '400px',
                width: '100%',
                border: '1px solid var(--color-ink)',
                boxShadow: '4px 4px 0px var(--color-ink)',
                textAlign: 'center',
              }}
            >
              <h3 style={{ color: 'var(--color-ink)', fontSize: '20px', marginBottom: '8px' }}>
                {qrModal.title}
              </h3>
              <p style={{ color: 'var(--color-fog)', fontSize: '14px', marginBottom: '24px' }}>
                {qrModal.subtitle}
              </p>
              
              <div style={{
                display: 'inline-block',
                padding: '16px',
                backgroundColor: '#fff',
                borderRadius: '16px',
                border: '1px solid var(--color-stone)',
                marginBottom: '24px',
              }}>
                <QRCodeSVG
                  value={(() => {
                    const origin = typeof window !== 'undefined' ? window.location.origin : '';
                    return `${origin}/enroll/${qrModal.token}`;
                  })()}
                  size={200}
                  level="M"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => setQrModal(null)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-ink)',
                    backgroundColor: 'var(--color-paper-white)',
                    color: 'var(--color-ink)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  Close
                </button>
                <button
                  onClick={() => copyEnrollLink(qrModal.token)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-ink)',
                    backgroundColor: copiedCode === qrModal.token ? 'var(--color-spring-green)' : 'var(--color-sun-yellow)',
                    color: 'var(--color-ink)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  {copiedCode === qrModal.token ? <Check size={16} /> : <Copy size={16} />}
                  {copiedCode === qrModal.token ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Teacher Modal */}
      <AnimatePresence>
        {createTeacherModal && (
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
            onClick={() => setCreateTeacherModal(false)}
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
                maxWidth: '400px',
                width: '100%',
                border: '1px solid var(--color-ink)',
                boxShadow: '4px 4px 0px var(--color-ink)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ color: 'var(--color-ink)', fontSize: '20px', margin: 0 }}>Create Teacher</h3>
                <button onClick={() => setCreateTeacherModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} color="var(--color-ink)" />
                </button>
              </div>

              <form onSubmit={handleCreateTeacher} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>Full Name</label>
                  <input
                    type="text"
                    required
                    value={teacherForm.name}
                    onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-ink)', fontSize: '14px' }}
                    placeholder="E.g., Dr. Jane Doe"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>Email Address</label>
                  <input
                    type="email"
                    required
                    value={teacherForm.email}
                    onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-ink)', fontSize: '14px' }}
                    placeholder="teacher@college.edu"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>Password</label>
                  <input
                    type="text"
                    required
                    value={teacherForm.password}
                    onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-ink)', fontSize: '14px' }}
                    placeholder="Minimum 8 chars, 1 letter, 1 number"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>Role</label>
                  <select
                    value={teacherForm.role}
                    onChange={(e) => setTeacherForm({ ...teacherForm, role: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-ink)', fontSize: '14px', backgroundColor: '#fff' }}
                  >
                    <option value="professor">Professor (Full Access)</option>
                    <option value="teacher">Teacher (Limited Access)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={creatingTeacher}
                  style={{
                    marginTop: '8px',
                    padding: '14px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-ink)',
                    backgroundColor: 'var(--color-sun-yellow)',
                    color: 'var(--color-ink)',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: creatingTeacher ? 'not-allowed' : 'pointer',
                    opacity: creatingTeacher ? 0.7 : 1
                  }}
                >
                  {creatingTeacher ? 'Creating...' : 'Create Credentials'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { classroomsAPI } from '../services/api';
import {
  Plus, Copy, Check, Users, BookOpen, Calendar,
  FlaskConical, BookMarked, ChevronRight, RefreshCw, Search
} from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchClassrooms();
  }, []);

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

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
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
      c.joinCode.toLowerCase().includes(q) ||
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
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/admin/classrooms/new')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '10px',
            border: 'none',
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
              onClick={() => navigate('/admin/classrooms/new')}
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
            {filteredClassrooms.map((classroom, i) => (
              <motion.div
                key={classroom._id}
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
                  cursor: 'pointer',
                  transition: 'box-shadow 200ms ease',
                }}
                onClick={() => navigate(`/admin/classrooms/${classroom._id}`)}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '4px 4px 0px var(--color-ink)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                {/* Top color bar */}
                <div style={{
                  height: '4px',
                  background: classroom.type === 'lab'
                    ? 'linear-gradient(90deg, #ff4dd5, #b7c5ff)'
                    : 'linear-gradient(90deg, #ffde3b, #c1f32b)',
                }} />

                <div style={{ padding: '20px' }}>
                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '16px',
                  }}>
                    <div>
                      <div style={{
                        color: 'var(--color-ink)',
                        fontSize: '16px',
                        letterSpacing: '-0.3px',
                        marginBottom: '4px',
                        fontWeight: 600,
                      }}>
                        {classroom.courseId?.title || 'Untitled Course'}
                      </div>
                      <div style={{
                        display: 'flex',
                        gap: '6px',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}>
                        <span className="admin-badge" style={{
                          backgroundColor: classroom.type === 'lab'
                            ? 'rgba(255,77,213,0.12)' : 'rgba(255,222,59,0.12)',
                          color: classroom.type === 'lab' ? '#ff4dd5' : '#ffde3b',
                        }}>
                          {classroom.type === 'lab' ? '🔬 Lab' : '📖 Theory'}
                        </span>
                        <span className="admin-badge">
                          Batch {classroom.classBatch}
                        </span>
                        <span className="admin-badge">
                          {classroom.session}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={18} color="var(--color-fog)" />
                  </div>

                  {/* Lab Batch */}
                  {classroom.type === 'lab' && classroom.labBatch && (
                    <div style={{
                      display: 'flex',
                      gap: '6px',
                      marginBottom: '16px',
                      flexWrap: 'wrap',
                    }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255,77,213,0.1)',
                        color: '#ff4dd5',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}>
                        Sub-batch: {classroom.labBatch}
                      </span>
                    </div>
                  )}

                  {/* Bottom row: Join code + student count */}
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
                        copyCode(classroom.joinCode);
                      }}
                    >
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '18px',
                        letterSpacing: '3px',
                        color: 'var(--color-ink)',
                        fontWeight: 600,
                      }}>
                        {classroom.joinCode}
                      </span>
                      <motion.div
                        whileTap={{ scale: 0.85 }}
                        style={{
                          color: copiedCode === classroom.joinCode ? 'var(--color-spring-green)' : 'var(--color-fog)',
                          display: 'flex',
                        }}
                      >
                        {copiedCode === classroom.joinCode ? <Check size={16} /> : <Copy size={16} />}
                      </motion.div>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: 'var(--color-fog)',
                      fontSize: '13px',
                    }}>
                      <Users size={14} />
                      {classroom.studentCount || 0}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

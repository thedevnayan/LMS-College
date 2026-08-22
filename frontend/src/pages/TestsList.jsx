import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { testsAPI } from '../services/api';
import { PenTool, Plus, Trash2, Clock, Zap, RefreshCcw, FileCode } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TestsList() {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const res = await testsAPI.getAll();
      if (res.success) {
        setTests(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch tests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this test?')) {
      try {
        await testsAPI.delete(id);
        setTests(prev => prev.filter(t => t._id !== id));
      } catch (err) {
        console.error('Failed to delete test', err);
      }
    }
  };

  const handleHostLive = async (test, e) => {
    e.stopPropagation();
    try {
      if (!test.joinCode) {
        await testsAPI.generateJoinCode(test._id);
      }
      navigate(`/admin/live-test/${test._id}/dashboard`);
    } catch (err) {
      console.error('Failed to host live test:', err);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'time-based': return <Clock size={18} />;
      case 'live-fastest-finger': return <Zap size={18} />;
      case 'live-round-robin': return <RefreshCcw size={18} />;
      default: return <PenTool size={18} />;
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      draft: { bg: '#e5e7eb', text: '#374151' },
      published: { bg: '#dcfce7', text: '#166534' },
      active: { bg: '#fef08a', text: '#854d0e' },
      completed: { bg: '#dbeafe', text: '#1e3a8a' }
    };
    const c = colors[status] || colors.draft;
    return (
      <span style={{ backgroundColor: c.bg, color: c.text, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' }}>
        {status}
      </span>
    );
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ color: 'var(--color-ink)', fontSize: '28px', letterSpacing: '-1px', marginBottom: '8px' }}>
            Tests & Quizzes
          </h1>
          <p style={{ color: 'var(--color-fog)', fontSize: '15px' }}>
            Manage assessments, live quizzes, and coding challenges
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/admin/tests/new')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 24px', borderRadius: '10px',
            backgroundColor: 'var(--color-ink)', color: 'var(--color-pure-white)',
            border: 'none', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
          }}
        >
          <Plus size={18} /> Create New Test
        </motion.button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="admin-spinner" />
        </div>
      ) : tests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 40px', backgroundColor: 'var(--color-paper-white)', borderRadius: '16px', border: '2px dashed var(--color-fog)' }}>
          <Zap size={48} color="var(--color-fog)" style={{ marginBottom: '16px' }} />
          <h3 style={{ color: 'var(--color-ink)', fontSize: '18px', marginBottom: '8px' }}>No tests found</h3>
          <p style={{ color: 'var(--color-fog)', fontSize: '14px' }}>Create a quiz or coding challenge to evaluate your students.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {tests.map((test) => (
            <div
              key={test._id}
              onClick={() => navigate(`/admin/tests/${test._id}/edit`)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '24px', backgroundColor: 'var(--color-paper-white)',
                borderRadius: '16px', border: '2px solid var(--color-ink)',
                boxShadow: '4px 4px 0px var(--color-ink)', cursor: 'pointer',
                transition: 'transform 0.1s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ padding: '12px', backgroundColor: 'var(--color-warm-linen)', borderRadius: '12px', border: '2px solid var(--color-ink)' }}>
                  {getTypeIcon(test.testType)}
                </div>
                <div>
                  <h3 style={{ color: 'var(--color-ink)', fontSize: '18px', marginBottom: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {test.title}
                    {getStatusBadge(test.status)}
                  </h3>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--color-fog)', fontWeight: 500 }}>
                    <span>
                      {test.classroomId?.courseId?.title} (Batch {test.classroomId?.classBatch}
                      {test.classroomId?.labBatch ? ` / Sub ${test.classroomId.labBatch}` : ''})
                    </span>
                    <span>•</span>
                    <span>{test.questions?.length || 0} Questions</span>
                    {test.timeLimit > 0 && (
                      <>
                        <span>•</span>
                        <span>{test.timeLimit} mins</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {test.testType !== 'standard' && (
                  <button
                    onClick={(e) => handleHostLive(test, e)}
                    className="admin-btn-primary"
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                  >
                    Host Live
                  </button>
                )}
                <button
                  onClick={(e) => handleDelete(test._id, e)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '2px solid var(--color-fog)', backgroundColor: 'transparent', color: 'var(--color-fog)', cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-fog)'; e.currentTarget.style.color = 'var(--color-fog)'; }}
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

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { assignmentsAPI } from '../services/api';
import { BookOpen, Plus, Calendar, Edit, Trash2, Loader, Sparkles, BarChart } from 'lucide-react';

export default function AssignmentsList() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const res = await assignmentsAPI.getAll();
      if (res.success) {
        setAssignments(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this assignment?')) {
      try {
        await assignmentsAPI.delete(id);
        setAssignments((prev) => prev.filter((a) => a._id !== id));
      } catch (err) {
        console.error('Failed to delete assignment:', err);
      }
    }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
      }}>
        <div>
          <h1 style={{ color: 'var(--color-ink)', fontSize: '28px', letterSpacing: '-1px', marginBottom: '8px' }}>
            Assignments
          </h1>
          <p style={{ color: 'var(--color-fog)', fontSize: '15px' }}>
            Manage all assignments across your courses
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/admin/assignments/new')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            borderRadius: '10px',
            backgroundColor: 'var(--color-ink)',
            color: 'var(--color-pure-white)',
            border: 'none',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Plus size={18} />
          Create Assignment
        </motion.button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="admin-spinner" />
        </div>
      ) : assignments.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 40px',
          backgroundColor: 'var(--color-paper-white)',
          borderRadius: 'var(--radius-cards)',
          border: '1px solid var(--color-ink)',
        }}>
          <BookOpen size={48} color="var(--color-fog)" style={{ marginBottom: '16px' }} />
          <h3 style={{ color: 'var(--color-ink)', fontSize: '18px', marginBottom: '8px' }}>
            No assignments yet
          </h3>
          <p style={{ color: 'var(--color-fog)', fontSize: '14px', marginBottom: '24px' }}>
            Create your first assignment and populate it with questions.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          <AnimatePresence>
            {assignments.map((assignment, i) => (
              <motion.div
                key={assignment._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '24px',
                  backgroundColor: 'var(--color-paper-white)',
                  borderRadius: 'var(--radius-cards)',
                  border: '1px solid var(--color-ink)',
                  transition: 'box-shadow 0.2s',
                }}
              >
                <div>
                  <h3 style={{ color: 'var(--color-ink)', fontSize: '18px', marginBottom: '8px' }}>
                    {assignment.title}
                  </h3>
                  <div style={{ display: 'flex', gap: '12px', color: 'var(--color-fog)', fontSize: '13px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '4px 8px',
                      backgroundColor: 'rgba(0,0,0,0.05)',
                      borderRadius: '6px',
                      color: 'var(--color-ink)',
                    }}>
                      {assignment.courseTitle}
                    </span>
                    <span>•</span>
                    <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>
                      {assignment.batchName}
                    </span>
                    <span>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={14} />
                      Start: {new Date(assignment.startDate).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={14} color="#d32f2f" />
                      Due: {new Date(assignment.dueDate).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span>{assignment.questions?.length || 0} MCQs</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Link
                    to={`/admin/assignments/${assignment._id}/report`}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-ink)',
                      backgroundColor: 'transparent',
                      color: 'var(--color-ink)',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <BarChart size={16} /> Report
                  </Link>
                  <button
                    onClick={() => navigate(`/admin/assignments/${assignment._id}/edit`)}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-ink)',
                      backgroundColor: 'transparent',
                      color: 'var(--color-ink)',
                      cursor: 'pointer',
                    }}
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(assignment._id, e)}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,107,107,0.3)',
                      backgroundColor: 'rgba(255,107,107,0.05)',
                      color: '#d32f2f',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

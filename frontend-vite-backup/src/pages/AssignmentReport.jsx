import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { assignmentsAPI } from '../services/api';
import { ArrowLeft, BarChart, Clock, Users, ArrowDown, ArrowUp } from 'lucide-react';

export default function AssignmentReport() {
  const { id } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Sorting state: field and direction
  const [sortField, setSortField] = useState('submittedAt');
  const [sortDirection, setSortDirection] = useState('desc');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assignRes, subRes] = await Promise.all([
        assignmentsAPI.getById(id),
        assignmentsAPI.getSubmissions(id)
      ]);
      setAssignment(assignRes.data);
      setSubmissions(subRes.data);
    } catch (err) {
      setError(err.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'submittedAt' ? 'desc' : 'asc');
    }
  };

  const sortedSubmissions = useMemo(() => {
    return [...submissions].sort((a, b) => {
      let valA, valB;
      
      if (sortField === 'name') {
        valA = a.studentId?.name?.toLowerCase() || '';
        valB = b.studentId?.name?.toLowerCase() || '';
      } else if (sortField === 'marks') {
        valA = a.marks || 0;
        valB = b.marks || 0;
      } else if (sortField === 'submittedAt') {
        valA = new Date(a.submittedAt).getTime();
        valB = new Date(b.submittedAt).getTime();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [submissions, sortField, sortDirection]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <div className="admin-spinner"></div>
      </div>
    );
  }

  if (error || !assignment) {
    return <div style={{ color: 'red', padding: '20px' }}>Error: {error}</div>;
  }

  const avgScore = submissions.length > 0 
    ? (submissions.reduce((acc, sub) => acc + (sub.marks || 0), 0) / submissions.length).toFixed(1)
    : 0;

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px', paddingTop: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <Link 
          to="/admin/assignments" 
          className="admin-btn-outline"
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            textDecoration: 'none',
            padding: '10px 16px'
          }}
        >
          <ArrowLeft size={16} /> Back
        </Link>
        <h1 style={{ fontSize: '32px', color: 'var(--color-ink)', fontWeight: 800, margin: 0, letterSpacing: '-1px' }}>
          Assignment Report
        </h1>
      </div>

      <div style={{ 
        backgroundColor: 'var(--color-paper-white)',
        padding: '32px',
        borderRadius: '16px',
        border: '2px solid var(--color-ink)',
        boxShadow: '8px 8px 0px var(--color-ink)',
        marginBottom: '40px'
      }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', letterSpacing: '-0.5px' }}>{assignment.title}</h2>
        <p style={{ color: 'var(--color-fog)', fontSize: '15px', marginBottom: '24px', fontWeight: 500 }}>
          Classroom: {assignment.classroomId?.courseId?.title ? 
            `${assignment.classroomId.courseId.title} - Batch ${assignment.classroomId.classBatch}` : 
            'Unknown'}
        </p>
        
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', backgroundColor: 'var(--color-warm-linen)', borderRadius: '8px', border: '1px solid var(--color-ink)' }}>
              <Users size={20} color="var(--color-ink)" />
            </div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Submissions</p>
              <p style={{ fontSize: '18px', fontWeight: 700 }}>{submissions.length}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', backgroundColor: 'var(--color-warm-linen)', borderRadius: '8px', border: '1px solid var(--color-ink)' }}>
              <BarChart size={20} color="var(--color-ink)" />
            </div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Average Score</p>
              <p style={{ fontSize: '18px', fontWeight: 700 }}>{avgScore} / {assignment.maxMarks}</p>
            </div>
          </div>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', backgroundColor: 'var(--color-pure-white)', borderRadius: '16px', border: '2px dashed var(--color-fog)' }}>
          <p style={{ color: 'var(--color-fog)', fontSize: '16px', fontWeight: 500 }}>No submissions yet for this assignment.</p>
        </div>
      ) : (
        <div style={{ 
          backgroundColor: 'var(--color-pure-white)',
          borderRadius: '16px',
          border: '2px solid var(--color-ink)',
          boxShadow: '8px 8px 0px var(--color-ink)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: 'var(--color-paper-white)', borderBottom: '2px solid var(--color-ink)' }}>
              <tr>
                <th 
                  onClick={() => handleSort('name')}
                  style={{ padding: '18px 24px', fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', color: 'var(--color-ink)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Student Name <SortIcon field="name" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('submittedAt')}
                  style={{ padding: '18px 24px', fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', color: 'var(--color-ink)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Time <SortIcon field="submittedAt" />
                  </div>
                </th>
                <th style={{ padding: '18px 24px', fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-ink)' }}>
                  Status
                </th>
                <th 
                  onClick={() => handleSort('marks')}
                  style={{ padding: '18px 24px', fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', color: 'var(--color-ink)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Marks <SortIcon field="marks" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedSubmissions.map((sub, index) => (
                <tr key={sub._id} style={{ borderBottom: index === sortedSubmissions.length - 1 ? 'none' : '1px solid var(--color-ink)', backgroundColor: index % 2 === 0 ? 'transparent' : 'var(--color-paper-white)' }}>
                  <td style={{ padding: '18px 24px', fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)' }}>
                    {sub.studentId?.name || 'Unknown Student'}
                  </td>
                  <td style={{ padding: '18px 24px', fontSize: '15px', color: 'var(--color-fog)', fontWeight: 500 }}>
                    {new Date(sub.submittedAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '18px 24px' }}>
                    <span className="admin-badge" style={{ 
                      backgroundColor: sub.status === 'graded' ? 'var(--color-lime-burst)' : 'var(--color-sand)',
                      fontWeight: 700,
                      border: '2px solid var(--color-ink)',
                      boxShadow: '2px 2px 0px var(--color-ink)',
                      color: 'var(--color-ink)'
                    }}>
                      {sub.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '18px 24px', fontSize: '18px', fontWeight: 800, color: 'var(--color-ink)' }}>
                    {sub.marks !== null ? `${sub.marks} / ${assignment.maxMarks}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

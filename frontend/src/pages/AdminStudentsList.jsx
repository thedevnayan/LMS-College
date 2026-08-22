import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, ChevronRight } from 'lucide-react';
import { studentsAPI } from '../services/api';

export default function AdminStudentsList() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await studentsAPI.getAll();
      if (res.success) {
        setStudents(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => 
    student.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-1px' }}>
            My Students
          </h1>
          <p style={{ color: 'var(--color-fog)', marginTop: '8px' }}>
            View records and performance of all students across your classes.
          </p>
        </div>
        <div style={{ padding: '16px', backgroundColor: '#e0e7ff', borderRadius: '20px', border: '2px solid var(--color-ink)', boxShadow: '4px 4px 0px var(--color-ink)' }}>
          <Users size={32} color="#4f46e5" />
        </div>
      </div>

      {/* Search & Actions */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={20} color="var(--color-fog)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search students by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '16px 16px 16px 48px',
              backgroundColor: 'var(--color-paper-white)',
              border: '2px solid var(--color-ink)',
              borderRadius: '12px',
              fontSize: '16px',
              boxShadow: '4px 4px 0px rgba(0,0,0,0.05)',
              outline: 'none',
              transition: 'box-shadow 0.2s',
            }}
          />
        </div>
      </div>

      {/* Students List */}
      <div style={{ backgroundColor: 'var(--color-paper-white)', border: '2px solid var(--color-ink)', borderRadius: '16px', overflow: 'hidden', boxShadow: '4px 4px 0px var(--color-ink)' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-fog)' }}>Loading students...</div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-fog)' }}>No students found matching your search.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-warm-linen)', borderBottom: '2px solid var(--color-ink)' }}>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontWeight: 800, color: 'var(--color-ink)' }}>Student</th>
                <th style={{ padding: '16px 24px', textAlign: 'center', fontWeight: 800, color: 'var(--color-ink)' }}>Classes Enrolled</th>
                <th style={{ padding: '16px 24px', textAlign: 'center', fontWeight: 800, color: 'var(--color-ink)' }}>Tests Attended</th>
                <th style={{ padding: '16px 24px', textAlign: 'center', fontWeight: 800, color: 'var(--color-ink)' }}>Avg Score</th>
                <th style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 800, color: 'var(--color-ink)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, index) => (
                <tr 
                  key={student._id}
                  style={{ 
                    borderBottom: index !== filteredStudents.length - 1 ? '1px solid var(--color-ink)' : 'none',
                    transition: 'background-color 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => navigate(`/admin/students/${student._id}`)}
                >
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-ink)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                        {student.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--color-ink)' }}>{student.name}</div>
                        <div style={{ fontSize: '13px', color: 'var(--color-fog)' }}>{student.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center', fontWeight: 700, color: 'var(--color-ink)' }}>
                    {student.classroomsEnrolled}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center', fontWeight: 700, color: 'var(--color-ink)' }}>
                    {student.testsAttended}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      backgroundColor: student.averageMarks >= 70 ? '#dcfce7' : student.averageMarks >= 40 ? '#fef9c3' : '#fee2e2', 
                      color: student.averageMarks >= 70 ? '#166534' : student.averageMarks >= 40 ? '#854d0e' : '#991b1b',
                      borderRadius: '8px', 
                      fontWeight: 800,
                      fontSize: '14px'
                    }}>
                      {student.averageMarks}%
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigate(`/admin/students/${student._id}`); }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: 'var(--color-paper-white)',
                        border: '2px solid var(--color-ink)',
                        borderRadius: '8px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '2px 2px 0px var(--color-ink)',
                      }}
                    >
                      Profile <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

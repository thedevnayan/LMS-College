import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { BookOpen, Users, Calendar } from 'lucide-react';

export default function StudentClassroomList() {
  const navigate = useNavigate();
  const { classrooms, loadingClassrooms } = useOutletContext();

  if (loadingClassrooms) {
    return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-fog)' }}>Loading classrooms...</div>;
  }

  if (!classrooms || classrooms.length === 0) {
    return null; // Handled by gatekeeper
  }

  return (
    <div>
      <h2 style={{ fontSize: '24px', color: 'var(--color-ink)', fontWeight: 800, marginBottom: '24px' }}>Your Classrooms</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        {classrooms.map((classroom) => (
          <div 
            key={classroom._id}
            onClick={() => navigate(`/classrooms/${classroom._id}`)}
            style={{ 
              backgroundColor: 'var(--color-paper-white)', 
              borderRadius: '20px', 
              border: '2px solid var(--color-ink)', 
              boxShadow: '4px 4px 0px var(--color-ink)',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {/* Thumbnail */}
            <div style={{ height: '140px', backgroundColor: 'var(--color-sun-yellow)', borderBottom: '2px solid var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={48} color="var(--color-ink)" opacity={0.5} />
            </div>
            
            {/* Content */}
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ padding: '4px 8px', backgroundColor: classroom.type === 'theory' ? '#e0e7ff' : '#fef3c7', color: 'var(--color-ink)', borderRadius: '8px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                  {classroom.type}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--color-fog)', fontWeight: 600 }}>
                  Batch {classroom.classBatch}{classroom.labBatch ? ` - ${classroom.labBatch}` : ''}
                </span>
              </div>
              
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-ink)', marginBottom: '16px' }}>
                {classroom.courseId?.title || 'Unknown Course'}
              </h3>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--color-fog)', fontSize: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={16} />
                  {classroom.session}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { classroomsAPI, materialsAPI, assignmentsAPI, testsAPI } from '../services/api';
import { BookOpen, FileText, CheckSquare, Clock, ArrowLeft, Download, PlayCircle } from 'lucide-react';

export default function StudentClassroomDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [classroom, setClassroom] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState('materials'); // 'materials', 'assignments', 'tests'

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError('');
      try {
        const [clsRes, matRes, assRes, testRes] = await Promise.all([
          classroomsAPI.getById(id),
          materialsAPI.listByClassroom(id),
          assignmentsAPI.listByClassroom(id),
          testsAPI.listByClassroom(id),
        ]);
        
        if (clsRes.success) setClassroom(clsRes.data);
        if (matRes.success) setMaterials(matRes.data);
        if (assRes.success) setAssignments(assRes.data);
        if (testRes.success) setTests(testRes.data);
        
      } catch (err) {
        setError(err.message || 'Failed to load classroom details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();
  }, [id]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-fog)' }}>Loading classroom...</div>;
  }

  if (error || !classroom) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ color: '#991b1b', marginBottom: '16px' }}>{error || 'Classroom not found'}</div>
        <button className="admin-btn-secondary" onClick={() => navigate('/dashboard')}>Go Back</button>
      </div>
    );
  }

  const tabs = [
    { id: 'materials', label: 'Materials', icon: BookOpen, count: materials.length },
    { id: 'assignments', label: 'Assignments', icon: FileText, count: assignments.length },
    { id: 'tests', label: 'Tests & Quizzes', icon: CheckSquare, count: tests.length },
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Header */}
      <button 
        onClick={() => navigate('/dashboard')}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--color-fog)', fontWeight: 600, cursor: 'pointer', padding: '0', marginBottom: '24px' }}
      >
        <ArrowLeft size={18} /> Back to Dashboard
      </button>
      
      <div style={{ backgroundColor: 'var(--color-ink)', padding: '40px', borderRadius: '24px', boxShadow: '8px 8px 0px var(--color-sun-yellow)', marginBottom: '40px', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ padding: '4px 12px', backgroundColor: classroom.type === 'theory' ? '#e0e7ff' : '#fef3c7', color: 'var(--color-ink)', borderRadius: '12px', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>
            {classroom.type}
          </span>
          <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Batch {classroom.classBatch}</span>
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '8px' }}>
          {classroom.courseId?.title}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px', maxWidth: '600px' }}>
          {classroom.courseId?.description}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', borderBottom: '2px solid rgba(15, 15, 18, 0.1)', paddingBottom: '16px', overflowX: 'auto' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '16px',
                backgroundColor: isActive ? 'var(--color-ink)' : 'transparent',
                color: isActive ? 'white' : 'var(--color-fog)',
                border: isActive ? '2px solid var(--color-ink)' : '2px solid transparent',
                fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}
            >
              <Icon size={18} />
              {tab.label}
              <span style={{ 
                backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(15,15,18,0.1)', 
                padding: '2px 8px', borderRadius: '10px', fontSize: '12px' 
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div>
        
        {/* Materials Tab */}
        {activeTab === 'materials' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {materials.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--color-paper-white)', borderRadius: '20px', border: '2px dashed var(--color-fog)', color: 'var(--color-fog)' }}>
                No materials have been posted yet.
              </div>
            ) : materials.map(mat => (
              <div key={mat._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px', backgroundColor: 'var(--color-paper-white)', borderRadius: '20px', border: '2px solid var(--color-ink)', boxShadow: '4px 4px 0px var(--color-ink)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ padding: '12px', backgroundColor: '#e0e7ff', borderRadius: '16px' }}>
                    <BookOpen size={24} color="#4f46e5" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-ink)', marginBottom: '4px' }}>{mat.title}</h3>
                    <p style={{ color: 'var(--color-fog)', fontSize: '14px' }}>{mat.description}</p>
                  </div>
                </div>
                <button 
                  onClick={() => navigate(`/classrooms/${id}/materials/${mat._id}`)}
                  className="admin-btn-secondary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Download size={16} /> View
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Assignments Tab */}
        {activeTab === 'assignments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {assignments.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--color-paper-white)', borderRadius: '20px', border: '2px dashed var(--color-fog)', color: 'var(--color-fog)' }}>
                No pending assignments!
              </div>
            ) : assignments.map(task => (
              <div key={task._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px', backgroundColor: 'var(--color-paper-white)', borderRadius: '20px', border: '2px solid var(--color-ink)', boxShadow: '4px 4px 0px var(--color-ink)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '16px' }}>
                    <FileText size={24} color="#d97706" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-ink)', marginBottom: '4px' }}>{task.title}</h3>
                    {task.submissionStatus !== 'unsubmitted' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontSize: '13px', fontWeight: 600 }}>
                        <CheckSquare size={14} /> Submitted on: {new Date(task.submittedAt || task.updatedAt || Date.now()).toLocaleDateString()}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#991b1b', fontSize: '13px', fontWeight: 600 }}>
                        <Clock size={14} /> Due: {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => navigate(`/classrooms/${id}/assignments/${task._id}`)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '10px 24px', 
                    backgroundColor: task.submissionStatus !== 'unsubmitted' ? '#10b981' : 'var(--color-ink)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '12px', 
                    cursor: 'pointer', 
                    fontWeight: 700,
                    fontSize: '15px'
                  }}
                >
                  {task.submissionStatus !== 'unsubmitted' ? 'Completed' : 'Open'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tests Tab */}
        {activeTab === 'tests' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {tests.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--color-paper-white)', borderRadius: '20px', border: '2px dashed var(--color-fog)', color: 'var(--color-fog)' }}>
                No upcoming tests.
              </div>
            ) : tests.map(test => (
              <div key={test._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px', backgroundColor: 'var(--color-paper-white)', borderRadius: '20px', border: '2px solid var(--color-ink)', boxShadow: '4px 4px 0px var(--color-ink)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '16px' }}>
                    <CheckSquare size={24} color="#b91c1c" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-ink)' }}>{test.title}</h3>
                      <span style={{ padding: '2px 8px', backgroundColor: 'var(--color-ink)', color: 'white', borderRadius: '8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                        {test.testType ? test.testType.replace('-', ' ') : 'Standard'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--color-fog)', fontSize: '13px', fontWeight: 500 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} /> {test.timeLimit || 0} mins
                      </span>
                      <span>Total Marks: {test.questions ? test.questions.reduce((sum, q) => sum + (q.points || 1), 0) : 0}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => navigate(`/classrooms/${id}/tests/${test._id}/join`)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '10px 24px', 
                    backgroundColor: 'var(--color-sun-yellow)', 
                    color: 'var(--color-ink)', 
                    border: '2px solid var(--color-ink)', 
                    borderRadius: '12px', 
                    cursor: 'pointer', 
                    fontWeight: 800,
                    fontSize: '15px',
                    boxShadow: '4px 4px 0px var(--color-ink)'
                  }}
                >
                  <PlayCircle size={18} /> Start
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

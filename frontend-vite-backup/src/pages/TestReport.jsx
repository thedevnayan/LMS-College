import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { testsAPI } from '../services/api';
import { ArrowLeft, Users, TrendingUp, Trophy, AlertCircle, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react';

export default function TestReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedAttemptId, setExpandedAttemptId] = useState(null);

  useEffect(() => {
    fetchReport();
  }, [id]);

  const fetchReport = async () => {
    try {
      const res = await testsAPI.getReport(id);
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch test report:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="admin-spinner" style={{ margin: '100px auto' }} />;
  }

  if (!data || !data.test) {
    return <div style={{ textAlign: 'center', marginTop: '60px' }}>Failed to load report.</div>;
  }

  const { test, stats, attempts } = data;

  const StatCard = ({ title, value, icon, color }) => (
    <div style={{ padding: '24px', backgroundColor: 'var(--color-paper-white)', borderRadius: '16px', border: '2px solid var(--color-ink)', boxShadow: '4px 4px 0px var(--color-ink)', display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ padding: '16px', backgroundColor: color, borderRadius: '12px', border: '2px solid var(--color-ink)', color: 'var(--color-ink)' }}>
        {icon}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--color-fog)' }}>{title}</p>
        <p style={{ margin: 0, fontSize: '28px', fontWeight: 900, color: 'var(--color-ink)' }}>{value}</p>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <button 
          onClick={() => navigate('/admin/tests')}
          style={{ padding: '8px', borderRadius: '50%', border: '2px solid var(--color-ink)', backgroundColor: 'var(--color-paper-white)', cursor: 'pointer' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ color: 'var(--color-ink)', fontSize: '28px', letterSpacing: '-1px', marginBottom: '4px' }}>
            Report: {test.title}
          </h1>
          <p style={{ color: 'var(--color-fog)', fontSize: '15px' }}>
            {test.classroomId?.courseId?.title} (Batch {test.classroomId?.classBatch})
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <StatCard title="Total Attempts" value={stats.totalParticipants} icon={<Users size={28} />} color="var(--color-sun-yellow)" />
        <StatCard title="Average Score" value={stats.averageScore} icon={<TrendingUp size={28} />} color="#60a5fa" />
        <StatCard title="Highest Score" value={stats.highestScore} icon={<Trophy size={28} />} color="#34d399" />
        <StatCard title="Lowest Score" value={stats.lowestScore} icon={<AlertCircle size={28} />} color="#f87171" />
      </div>

      {/* Attempts List */}
      <h2 style={{ fontSize: '20px', color: 'var(--color-ink)', marginBottom: '16px' }}>Student Performance</h2>
      
      {attempts.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--color-paper-white)', borderRadius: '16px', border: '2px dashed var(--color-fog)' }}>
          <p style={{ color: 'var(--color-fog)', fontSize: '16px' }}>No students have attempted this test yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {attempts.map(attempt => {
            const isExpanded = expandedAttemptId === attempt._id;
            return (
              <div key={attempt._id} style={{ backgroundColor: 'var(--color-paper-white)', borderRadius: '16px', border: '2px solid var(--color-ink)', overflow: 'hidden' }}>
                {/* Row Header */}
                <div 
                  onClick={() => setExpandedAttemptId(isExpanded ? null : attempt._id)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', cursor: 'pointer', backgroundColor: isExpanded ? 'var(--color-warm-linen)' : 'transparent' }}
                >
                  <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-ink)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {attempt.studentId?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-ink)' }}>{attempt.studentId?.name || 'Unknown Student'}</h3>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-fog)' }}>{attempt.studentId?.rollNumber || attempt.studentId?.email}</p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-fog)', textTransform: 'uppercase', fontWeight: 700 }}>Score</p>
                      <p style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: 'var(--color-ink)' }}>{attempt.score}</p>
                    </div>
                    <div style={{ textAlign: 'right', width: '100px' }}>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-fog)', textTransform: 'uppercase', fontWeight: 700 }}>Status</p>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: attempt.status === 'completed' ? '#16a34a' : '#ea580c' }}>
                        {attempt.status}
                      </p>
                    </div>
                    {isExpanded ? <ChevronUp size={20} color="var(--color-fog)" /> : <ChevronDown size={20} color="var(--color-fog)" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--color-ink)', padding: '24px', backgroundColor: '#f8fafc' }}>
                    <h4 style={{ fontSize: '15px', color: 'var(--color-ink)', marginBottom: '16px', textTransform: 'uppercase' }}>Detailed Answers</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {test.questions.map((q, idx) => {
                        const studentAnswer = attempt.answers.find(a => a.questionId === q._id);
                        
                        return (
                          <div key={q._id} style={{ padding: '16px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                              <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)', margin: 0, maxWidth: '80%' }}>
                                {idx + 1}. {q.text}
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700 }}>
                                {studentAnswer?.isCorrect ? <CheckCircle size={16} color="#16a34a" /> : <XCircle size={16} color="#dc2626" />}
                                <span style={{ color: studentAnswer?.isCorrect ? '#16a34a' : '#dc2626' }}>
                                  {studentAnswer ? `${studentAnswer.pointsAwarded} / ${q.points} Pts` : 'Not Attempted'}
                                </span>
                              </div>
                            </div>
                            
                            {studentAnswer && (
                              <div style={{ marginTop: '12px' }}>
                                {q.questionType === 'mcq' && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ fontSize: '14px', color: '#64748b' }}>
                                      <strong>Student picked:</strong> {q.options[studentAnswer.mcqOptionIndex] || `Option ${studentAnswer.mcqOptionIndex + 1}`}
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#16a34a' }}>
                                      <strong>Correct answer:</strong> {q.options[q.correctOptionIndex]}
                                    </div>
                                  </div>
                                )}
                                
                                {q.questionType === 'coding' && (
                                  <div style={{ marginTop: '8px' }}>
                                    {studentAnswer.codingSourceCode ? (
                                      <pre style={{ backgroundColor: '#1e293b', color: '#f8fafc', padding: '16px', borderRadius: '8px', fontSize: '13px', overflowX: 'auto' }}>
                                        {studentAnswer.codingSourceCode}
                                      </pre>
                                    ) : (
                                      <span style={{ color: '#64748b', fontStyle: 'italic', fontSize: '13px' }}>Code was successfully submitted but source is not available.</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

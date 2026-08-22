import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { testsAPI } from '../services/api';
import { ArrowLeft, CheckSquare, Clock, AlertTriangle, PlayCircle } from 'lucide-react';

export default function StudentTestJoin() {
  const { classroomId, testId } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const res = await testsAPI.getById(testId);
        if (res.success) {
          setTest(res.data);
        }
      } catch (err) {
        setError(err.message || 'Failed to load test');
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [testId]);

  const handleStartTest = () => {
    setStarting(true);
    // Placeholder for actual test start logic
    setTimeout(() => {
      alert("Test taking environment is currently under construction! Stay tuned.");
      setStarting(false);
    }, 500);
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-fog)' }}>Loading test...</div>;
  }

  if (error || !test) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ color: '#991b1b', marginBottom: '16px' }}>{error || 'Test not found'}</div>
        <button className="admin-btn-secondary" onClick={() => navigate(`/classrooms/${classroomId}`)}>Go Back</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <button 
        onClick={() => navigate(`/classrooms/${classroomId}`)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--color-fog)', fontWeight: 600, cursor: 'pointer', padding: '0', marginBottom: '24px' }}
      >
        <ArrowLeft size={18} /> Back to Classroom
      </button>

      <div style={{ backgroundColor: 'var(--color-paper-white)', padding: '40px', borderRadius: '24px', border: '2px solid var(--color-ink)', boxShadow: '8px 8px 0px var(--color-ink)' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
          <div style={{ padding: '24px', backgroundColor: '#fee2e2', borderRadius: '24px', border: '2px solid var(--color-ink)' }}>
            <CheckSquare size={48} color="#b91c1c" />
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-block', padding: '4px 12px', backgroundColor: 'var(--color-ink)', color: 'white', borderRadius: '12px', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '12px' }}>
            {test.testType ? test.testType.replace('-', ' ') : 'Standard'}
          </div>
          <h1 style={{ fontSize: '32px', color: 'var(--color-ink)', fontWeight: 900, letterSpacing: '-1px', marginBottom: '16px' }}>
            {test.title}
          </h1>
          <p style={{ color: 'var(--color-fog)', fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>
            {test.description}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
          <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '16px', border: '1px dashed var(--color-fog)', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: '#e0e7ff', borderRadius: '12px' }}>
              <Clock size={24} color="#4f46e5" />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--color-fog)', fontWeight: 700, textTransform: 'uppercase' }}>Time Limit</div>
              <div style={{ fontSize: '20px', color: 'var(--color-ink)', fontWeight: 800 }}>{test.timeLimit || 0} Minutes</div>
            </div>
          </div>
          <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '16px', border: '1px dashed var(--color-fog)', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '12px' }}>
              <CheckSquare size={24} color="#d97706" />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--color-fog)', fontWeight: 700, textTransform: 'uppercase' }}>Total Marks</div>
              <div style={{ fontSize: '20px', color: 'var(--color-ink)', fontWeight: 800 }}>{test.questions ? test.questions.reduce((sum, q) => sum + (q.points || 1), 0) : 0} Points</div>
            </div>
          </div>
        </div>

        {/* Warning Box */}
        <div style={{ padding: '20px', backgroundColor: '#fffbeb', border: '2px solid #f59e0b', borderRadius: '16px', marginBottom: '40px', display: 'flex', gap: '16px' }}>
          <AlertTriangle size={24} color="#d97706" style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: '#b45309', fontSize: '16px', fontWeight: 800 }}>Before you start:</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#92400e', fontSize: '14px', lineHeight: '1.6' }}>
              <li>Ensure you have a stable internet connection.</li>
              <li>Do not refresh the page or navigate away during the test.</li>
              <li>The timer will not pause once started.</li>
              {test.type === 'fastest-finger' && <li><strong>Fastest Finger:</strong> Speed matters! You will be scored based on how fast you answer.</li>}
            </ul>
          </div>
        </div>

        <button 
          onClick={handleStartTest}
          disabled={starting}
          className="admin-btn-primary"
          style={{ width: '100%', padding: '20px', fontSize: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', backgroundColor: 'var(--color-sun-yellow)', color: 'var(--color-ink)', border: '2px solid var(--color-ink)', opacity: starting ? 0.7 : 1, cursor: starting ? 'not-allowed' : 'pointer' }}
        >
          <PlayCircle size={24} />
          {starting ? 'Preparing...' : 'Start Test Now'}
        </button>

      </div>
    </div>
  );
}

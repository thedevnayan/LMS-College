'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { testsAPI } from '@/services/api';
import { ArrowLeft, CheckSquare, Clock, AlertTriangle, PlayCircle } from 'lucide-react';

export default function StudentTestJoin() {
  const { classroomId, testId } = useParams();
  const router = useRouter();

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

  const [showCodePrompt, setShowCodePrompt] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const handleStartTest = async () => {
    if (test.testType.startsWith('live')) {
      setShowCodePrompt(true);
      return;
    }
    // For standard/time-based, go straight in
    router.push(`/live-test/${testId}`);
  };

  const handleVerifyCode = async () => {
    if (!joinCode.trim()) return;
    setStarting(true);
    setJoinError('');
    try {
      const res = await testsAPI.verifyJoinCode(joinCode);
      if (res.success && res.data.testId === testId) {
        router.push(`/live-test/${testId}`);
      } else {
        setJoinError('Code does not match this test.');
      }
    } catch (err) {
      setJoinError(err.message || 'Invalid join code');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-fog)' }}>Loading test...</div>;
  }

  if (error || !test) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ color: '#991b1b', marginBottom: '16px' }}>{error || 'Test not found'}</div>
        <button className="admin-btn-secondary" onClick={() => router.push(`/classrooms/${classroomId}`)}>Go Back</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <button 
        onClick={() => router.push(`/classrooms/${classroomId}`)}
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

      {showCodePrompt && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 15, 18, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'var(--color-paper-white)', padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '440px',
            border: '2px solid var(--color-ink)', boxShadow: '8px 8px 0px var(--color-ink)', textAlign: 'center'
          }}>
            <h2 style={{ fontSize: '24px', color: 'var(--color-ink)', marginBottom: '8px' }}>Enter Join Code</h2>
            <p style={{ color: 'var(--color-fog)', fontSize: '15px', marginBottom: '32px' }}>
              Your professor will provide a 6-digit code to start this live test.
            </p>

            {joinError && (
              <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '12px', marginBottom: '24px', fontSize: '14px', fontWeight: 500, border: '1px solid #fca5a5' }}>
                {joinError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input 
                type="text" 
                className="admin-input" 
                placeholder="6-DIGIT CODE"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px', textTransform: 'uppercase', padding: '16px' }}
                required
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => { setShowCodePrompt(false); setJoinError(''); }}
                  className="admin-btn-secondary"
                  style={{ flex: 1, padding: '16px', fontSize: '16px' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleVerifyCode}
                  disabled={starting || joinCode.length < 6}
                  className="admin-btn-primary"
                  style={{ flex: 1, padding: '16px', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', opacity: (starting || joinCode.length < 6) ? 0.7 : 1, cursor: (starting || joinCode.length < 6) ? 'not-allowed' : 'pointer' }}
                >
                  {starting ? 'Joining...' : 'Join Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

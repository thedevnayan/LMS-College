'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { testsAPI, codeAPI, SOCKET_URL } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { connectSocket as io } from '@/services/socket';
import { toast } from 'sonner';
import { Clock, CheckSquare, AlertTriangle, WifiOff, Wifi, Play, UploadCloud } from 'lucide-react';
import Editor from '@monaco-editor/react';

export default function LiveTestAttempt() {
  const { testId } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [turnUserId, setTurnUserId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [answeredMap, setAnsweredMap] = useState({});
  const [code, setCode] = useState('');
  const [executing, setExecuting] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const socketRef = useRef(null);
  const deadlineRef = useRef(null);
  const busyRef = useRef(false);
  const applyState = useCallback(data => {
    const { test: value, attempt } = data;
    setTest(value); setQuestions(value.questions || []);
    setTurnUserId(value.turnUserId || null);
    const answers = Object.fromEntries((attempt?.answers || []).map(a => [a.questionId, a.mcqOptionIndex]));
    setAnsweredMap(answers); setScore(attempt?.score || 0);
    setCompleted(attempt?.status === 'completed' || value.liveStatus === 'ended');
    const independent = ['standard', 'time-based'].includes(value.testType);
    const firstOpen = (value.questions || []).findIndex(q => answers[q._id] === undefined);
    setCurrentQuestionIndex(independent ? Math.max(0, firstOpen) : value.currentQuestionIndex);
    const expiry = attempt?.deadlineAt || value.endTime;
    deadlineRef.current = expiry ? performance.now() + Math.max(0, new Date(expiry).getTime() - (data.serverNow || Date.now())) : null;
    setTimeLeft(expiry ? Math.max(0, Math.ceil((new Date(expiry).getTime() - (data.serverNow || Date.now())) / 1000)) : null);
  }, []);
  const restoreState = useCallback(async () => {
    const response = await testsAPI.getMyAttempt(testId);
    applyState(response.data);
  }, [testId, applyState]);
  useEffect(() => {
    if (!user?._id) return;
    const socket = io(SOCKET_URL, { reconnection: true, reconnectionDelay: 1000, reconnectionDelayMax: 5000 });
    socketRef.current = socket;
    socket.on('connect', async () => {
      try {
        const response = await socket.timeout(15000).emitWithAck('join_test', { testId });
        if (!response.success) throw new Error(response.error.message);
        applyState(response.data); setConnected(true); setError('');
      } catch (err) { setError(err.message); } finally { setLoading(false); }
    });
    socket.on('connect_error', err => { setError(err.message); setLoading(false); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('session_replaced', () => setError('This test was opened in another tab. Close it there before reconnecting here.'));
    socket.on('operation_error', err => toast.error(err.message));
    for (const event of ['test_started', 'go_next_question', 'test_ended']) socket.on(event, () => restoreState().catch(err => setError(err.message)));
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [user?._id, testId, applyState, restoreState]);
  const handleCompleteTest = useCallback(async () => {
    const socket = socketRef.current;
    if (!socket?.connected || busyRef.current) return;
    busyRef.current = true;
    try {
      const response = await socket.timeout(15000).emitWithAck('test_completed', { testId });
      if (!response.success) throw new Error(response.error.message);
      setScore(response.data.finalScore); setCompleted(true);
    } catch (err) { toast.error('Completion not confirmed: ' + err.message); }
    finally { busyRef.current = false; }
  }, [testId]);
  useEffect(() => {
    if (completed) return;
    const timer = setInterval(() => {
      if (deadlineRef.current === null) return;
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - performance.now()) / 1000));
      setTimeLeft(remaining);
      if (!remaining) handleCompleteTest();
    }, 1000);
    return () => clearInterval(timer);
  }, [completed, handleCompleteTest]);
  const handleAnswerSubmit = async optionIndex => {
    const socket = socketRef.current;
    const question = questions[currentQuestionIndex];
    if (!socket?.connected || completed || !question || busyRef.current || answeredMap[question._id] !== undefined) return;
    busyRef.current = true; setExecuting(true);
    try {
      const response = await socket.timeout(15000).emitWithAck('submit_answer', { testId, questionId: question._id, selectedOption: optionIndex });
      if (!response.success) throw new Error(response.error.message);
      setAnsweredMap(prev => ({ ...prev, [question._id]: optionIndex }));
      setScore(response.data.currentScore || 0);
      toast.success('Answer saved');
      if (['standard', 'time-based'].includes(test.testType)) {
        if (currentQuestionIndex < questions.length - 1) setCurrentQuestionIndex(index => index + 1);
        else { busyRef.current = false; await handleCompleteTest(); }
      }
    } catch (err) { toast.error('Answer not confirmed. Retry safely: ' + err.message); }
    finally { busyRef.current = false; setExecuting(false); }
  };
  const handleCodeRun = () => setRunResult({ type: 'error', error: 'Coding execution is unavailable until an isolated judge is configured.' });
  const handleCodeSubmit = handleCodeRun;
  if (error && !test) return <div role="alert" style={{ padding: 32 }}>{error}<button onClick={() => router.push('/dashboard')}>Back to dashboard</button></div>;
  if (loading || !test || !user) return <div className="admin-spinner" style={{ margin: '100px auto' }} />;

  if (completed) {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', padding: '40px', backgroundColor: 'var(--color-paper-white)', borderRadius: '24px', border: '2px solid var(--color-ink)', textAlign: 'center', boxShadow: '8px 8px 0px var(--color-ink)' }}>
        <CheckSquare size={64} color="#16a34a" style={{ marginBottom: '24px' }} />
        <h1 style={{ fontSize: '32px', color: 'var(--color-ink)', marginBottom: '16px' }}>Test Completed!</h1>
        <div style={{ fontSize: '48px', fontWeight: 900, color: '#16a34a', marginBottom: '8px' }}>{score}</div>
        <p style={{ color: 'var(--color-fog)', fontSize: '18px', marginBottom: '32px' }}>Your score has been saved successfully.</p>
        <button onClick={() => router.push(`/tests/${testId}/report`)} className="admin-btn-primary" style={{ marginBottom: 16 }}>View Full Report</button>
        <button onClick={() => router.push('/dashboard')} className="admin-btn-primary" style={{ padding: '16px 32px', fontSize: '18px' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const currentQ = questions[currentQuestionIndex];
  if (!currentQ) return <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--color-fog)', fontSize: '18px' }}>Waiting for professor to advance...</div>;

  const isMyTurn = test.testType === 'live-round-robin' ? (turnUserId || '').toString() === user._id.toString() : true;
  const formatTime = (secs) => `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;

  const isCoding = currentQ.questionType === 'coding';
  const isAnswered = answeredMap[currentQ._id] !== undefined || executing || !connected || (test.testType !== 'standard' && test.liveStatus !== 'in-progress');

  return (
    <div style={{ maxWidth: isCoding ? '1400px' : '800px', margin: '40px auto', padding: '0 20px' }}>
      
      {/* Connection status */}
      <div style={{
        position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 16px', borderRadius: '12px',
        backgroundColor: connected ? '#dcfce7' : '#fee2e2',
        border: `2px solid ${connected ? '#16a34a' : '#dc2626'}`,
        boxShadow: '4px 4px 0px var(--color-ink)',
        fontWeight: 700, fontSize: '13px',
        color: connected ? '#166534' : '#991b1b'
      }}>
        {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
        {connected ? 'Connected' : 'Reconnecting...'}
      </div>

      {/* Header bar */}
      <div className="test-header-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', padding: '24px', backgroundColor: 'var(--color-paper-white)', borderRadius: '24px', border: '2px solid var(--color-ink)', boxShadow: '8px 8px 0px var(--color-ink)' }}>
        <div>
          <h2 style={{ fontSize: '24px', color: 'var(--color-ink)', marginBottom: '4px' }}>{test.title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ padding: '2px 8px', backgroundColor: 'var(--color-sun-yellow)', borderRadius: '8px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>
              {test.testType.replace('-', ' ')}
            </span>
            <span style={{ fontWeight: 800, color: '#10b981', fontSize: '16px' }}>Score: {score}</span>
          </div>
        </div>
        
        {timeLeft !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: timeLeft < 60 ? '#fee2e2' : '#eff6ff', borderRadius: '16px', border: `2px solid ${timeLeft < 60 ? '#b91c1c' : '#3b82f6'}` }}>
            <Clock size={20} color={timeLeft < 60 ? '#b91c1c' : '#3b82f6'} />
            <span style={{ fontSize: '20px', fontWeight: 900, color: timeLeft < 60 ? '#b91c1c' : '#1d4ed8' }}>{formatTime(timeLeft)}</span>
          </div>
        )}
      </div>

      {!isMyTurn ? (
        <div style={{ padding: '60px', backgroundColor: '#eff6ff', borderRadius: '24px', border: '2px dashed #3b82f6', textAlign: 'center' }}>
          <Clock size={48} color="#3b82f6" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '24px', color: '#1d4ed8', marginBottom: '8px' }}>It&apos;s someone else&apos;s turn!</h3>
          <p style={{ color: '#3b82f6', fontSize: '16px' }}>Please wait until it is your turn to answer.</p>
        </div>
      ) : (
        <div className="test-attempt-grid" style={{ 
          display: isCoding ? 'grid' : 'block', 
          gridTemplateColumns: isCoding ? '1fr 1fr' : '1fr', 
          gap: '32px' 
        }}>
          
          {/* Left Side: Question Info */}
          <div style={{ padding: '32px', backgroundColor: 'var(--color-paper-white)', borderRadius: '24px', border: '2px solid var(--color-ink)', boxShadow: '8px 8px 0px var(--color-ink)', height: isCoding ? '600px' : 'auto', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-fog)' }}>Question {currentQuestionIndex + 1} of {questions.length}</span>
              {test.testType === 'live-fastest-finger' && (
                <span style={{ color: '#ea580c', fontWeight: 800, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle size={16} /> FASTEST FINGER: +10 Points!
                </span>
              )}
            </div>
            
            <h3 style={{ fontSize: '24px', color: 'var(--color-ink)', lineHeight: '1.4', marginBottom: '32px', whiteSpace: 'pre-wrap' }}>
              {currentQ.text}
            </h3>

            {!isCoding && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {currentQ.options?.map((opt, idx) => {
                  const isSelected = answeredMap[currentQ._id] === idx;
                  return (
                    <button
                      key={idx}
                      disabled={isAnswered}
                      onClick={() => handleAnswerSubmit(idx)}
                      style={{
                        padding: '20px',
                        textAlign: 'left',
                        fontSize: '18px',
                        backgroundColor: isSelected ? 'var(--color-warm-linen)' : 'transparent',
                        border: '2px solid',
                        borderColor: isSelected ? 'var(--color-ink)' : 'var(--color-fog)',
                        borderRadius: '16px',
                        cursor: isAnswered ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        fontWeight: 600,
                        color: isSelected ? 'var(--color-ink)' : '#334155'
                      }}
                    >
                      <span style={{ marginRight: '16px', fontWeight: 800, color: isSelected ? 'var(--color-ink)' : 'var(--color-fog)' }}>
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {isCoding && currentQ.testCases && currentQ.testCases.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <h4 style={{ fontSize: '18px', color: 'var(--color-ink)', marginBottom: '16px' }}>Examples:</h4>
                {currentQ.testCases.filter(tc => !tc.isHidden).map((tc, idx) => (
                  <div key={idx} style={{ padding: '16px', backgroundColor: 'var(--color-warm-linen)', borderRadius: '12px', border: '1px solid var(--color-ink)', marginBottom: '12px' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--color-fog)', textTransform: 'uppercase' }}>Input:</strong>
                      <div style={{ fontFamily: 'monospace', fontSize: '15px', color: 'var(--color-ink)', marginTop: '4px' }}>{tc.input}</div>
                    </div>
                    <div>
                      <strong style={{ fontSize: '13px', color: 'var(--color-fog)', textTransform: 'uppercase' }}>Output:</strong>
                      <div style={{ fontFamily: 'monospace', fontSize: '15px', color: 'var(--color-ink)', marginTop: '4px' }}>{tc.expectedOutput}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Side: Monaco Editor (Only for coding) */}
          {isCoding && (
            <div className="test-editor-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '600px' }}>
              
              <div style={{ flex: 1, backgroundColor: '#1e1e1e', borderRadius: '24px', border: '2px solid var(--color-ink)', boxShadow: '8px 8px 0px var(--color-ink)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '12px 20px', backgroundColor: '#2d2d2d', borderBottom: '1px solid #404040', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#d4d4d4', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase' }}>{currentQ.codingLanguage}</span>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      onClick={handleCodeRun}
                      disabled={executing || isAnswered}
                      style={{ padding: '6px 12px', backgroundColor: '#4b5563', color: 'white', borderRadius: '8px', border: 'none', cursor: executing || isAnswered ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
                    >
                      <Play size={14} /> Run Code
                    </button>
                    <button 
                      onClick={handleCodeSubmit}
                      disabled={executing || isAnswered}
                      style={{ padding: '6px 12px', backgroundColor: '#10b981', color: 'white', borderRadius: '8px', border: 'none', cursor: executing || isAnswered ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
                    >
                      <UploadCloud size={14} /> Submit
                    </button>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <Editor
                    height="100%"
                    language={currentQ.codingLanguage === 'nodejs' ? 'javascript' : currentQ.codingLanguage}
                    theme="vs-dark"
                    value={code}
                    onChange={(value) => setCode(value)}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 15,
                      fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                      padding: { top: 20 },
                      readOnly: isAnswered
                    }}
                  />
                </div>
              </div>

              {/* Console Output area */}
              {runResult && (
                <div style={{ height: '200px', backgroundColor: 'var(--color-paper-white)', borderRadius: '24px', border: '2px solid var(--color-ink)', boxShadow: '4px 4px 0px var(--color-ink)', overflowY: 'auto', padding: '20px' }}>
                  <h4 style={{ fontSize: '15px', color: 'var(--color-ink)', marginBottom: '12px', fontWeight: 800 }}>Console Output</h4>
                  
                  {runResult.type === 'error' && (
                    <div style={{ color: '#dc2626', fontFamily: 'monospace', whiteSpace: 'pre-wrap', backgroundColor: '#fee2e2', padding: '12px', borderRadius: '8px' }}>
                      {runResult.error}
                    </div>
                  )}

                  {runResult.type === 'run' && (
                    <div>
                      {runResult.data.stderr ? (
                        <div style={{ color: '#dc2626', fontFamily: 'monospace', whiteSpace: 'pre-wrap', backgroundColor: '#fee2e2', padding: '12px', borderRadius: '8px' }}>
                          {runResult.data.stderr}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ padding: '12px', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
                            <strong style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Stdout:</strong>
                            <div style={{ fontFamily: 'monospace', color: 'var(--color-ink)', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{runResult.data.stdout || 'No output'}</div>
                          </div>
                          {runResult.expected && (
                            <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
                              <strong style={{ fontSize: '12px', color: '#166534', textTransform: 'uppercase' }}>Expected:</strong>
                              <div style={{ fontFamily: 'monospace', color: '#166534', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{runResult.expected}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {runResult.type === 'submit' && (
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: runResult.isCorrect ? '#10b981' : '#dc2626', marginBottom: '16px' }}>
                        {runResult.isCorrect ? 'Accepted!' : 'Wrong Answer'} ({runResult.pointsAwarded} points)
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {runResult.results.map((r, i) => (
                          <div key={i} style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${r.passed ? '#86efac' : '#fca5a5'}`, backgroundColor: r.passed ? '#f0fdf4' : '#fee2e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: r.passed ? '#166534' : '#991b1b' }}>Test Case {r.testCaseIndex} {r.isHidden && '(Hidden)'}</span>
                            <span style={{ fontWeight: 800, color: r.passed ? '#166534' : '#991b1b' }}>{r.passed ? 'PASS' : 'FAIL'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

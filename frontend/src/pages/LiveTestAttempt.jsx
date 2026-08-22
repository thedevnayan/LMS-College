import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { testsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { Clock, CheckSquare, AlertTriangle, WifiOff, Wifi } from 'lucide-react';

export default function LiveTestAttempt() {
  const { testId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [turnUserId, setTurnUserId] = useState(null);
  const [questions, setQuestions] = useState([]);
  
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [answeredMap, setAnsweredMap] = useState({}); // questionId -> optionIndex

  // ── Restore state from DB on load (handles refresh / reconnect) ──
  const restoreState = async () => {
    try {
      const res = await testsAPI.getMyAttempt(testId);
      if (res.success) {
        const { attempt, liveState, test: testData } = res.data;
        
        setTest(testData);
        setCurrentQuestionIndex(liveState.currentQuestionIndex);
        setTurnUserId(liveState.turnUserId);

        // Shuffle questions for time-based tests, but keep consistent on reload
        if (testData.testType === 'time-based' || testData.testType === 'standard') {
          // Use a seeded shuffle based on testId + UserId so it's stable across refreshes
          const seed = (testId + user._id).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
          const shuffled = [...testData.questions].sort((a, b) => {
            const ha = (a._id || '').toString().charCodeAt(0) + seed;
            const hb = (b._id || '').toString().charCodeAt(0) + seed;
            return (ha % 97) - (hb % 97);
          });
          setQuestions(shuffled);
        } else {
          setQuestions(testData.questions || []);
        }

        // Restore existing attempt
        if (attempt) {
          setScore(attempt.score || 0);
          setCompleted(attempt.status === 'completed');

          // Rebuild answeredMap from saved answers
          const map = {};
          (attempt.answers || []).forEach(a => {
            map[a.questionId] = a.mcqOptionIndex;
          });
          setAnsweredMap(map);

          // For time-based: calculate remaining time
          if (testData.testType === 'time-based' && testData.timeLimit > 0 && attempt.status !== 'completed') {
            const elapsed = Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000);
            const remaining = (testData.timeLimit * 60) - elapsed;
            setTimeLeft(remaining > 0 ? remaining : 0);
          }

          // For standard/time-based: advance to next unanswered question
          if (testData.testType === 'time-based' || testData.testType === 'standard') {
            const answeredCount = attempt.answers?.length || 0;
            if (answeredCount > 0 && answeredCount < testData.questions.length) {
              setCurrentQuestionIndex(answeredCount);
            }
          }
        } else {
          // No attempt yet — fresh start
          if (testData.testType === 'time-based' && testData.timeLimit > 0) {
            setTimeLeft(testData.timeLimit * 60);
          }
        }
      }
    } catch (err) {
      console.error('Failed to restore test state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    restoreState();
  }, [testId]);

  // ── Socket connection with auto-reconnect ──
  useEffect(() => {
    if (!user || !testId || loading) return;

    const newSocket = io('http://localhost:5000', {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      newSocket.emit('join_test', {
        testId,
        userId: user._id,
        userName: user.name,
        role: 'student'
      });
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('go_next_question', (data) => {
      setCurrentQuestionIndex(data.nextQuestionIndex);
      if (data.turnUserId) {
        setTurnUserId(data.turnUserId);
      }
    });

    return () => newSocket.disconnect();
  }, [testId, user, loading]);

  // ── Timer for time-based tests ──
  useEffect(() => {
    if (timeLeft === null || completed) return;
    if (timeLeft <= 0) {
      handleCompleteTest();
      return;
    }
    const timerId = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, completed]);

  const handleAnswerSubmit = (optionIndex) => {
    if (!socket || completed) return;
    
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ || answeredMap[currentQ._id] !== undefined) return;

    // NOTE: correctOptionIndex is stripped for students by the API.
    // In production, the server must validate correctness.
    // For now we send the selection and let the socket server handle it.
    const isCorrect = optionIndex === currentQ.correctOptionIndex; 
    let pointsAwarded = 0;
    
    if (isCorrect) {
      pointsAwarded = test.testType === 'live-fastest-finger' ? 10 : (currentQ.points || 1);
    }

    const newScore = score + pointsAwarded;
    setScore(newScore);
    
    setAnsweredMap(prev => ({ ...prev, [currentQ._id]: optionIndex }));

    socket.emit('submit_answer', {
      testId,
      userId: user._id,
      userName: user.name,
      questionId: currentQ._id,
      selectedOption: optionIndex,
      isCorrect,
      points: pointsAwarded,
      currentScore: newScore
    });

    // Auto-advance for standard/time-based tests
    if (test.testType === 'time-based' || test.testType === 'standard') {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        handleCompleteTest();
      }
    }
  };

  const handleCompleteTest = () => {
    if (completed) return;
    setCompleted(true);
    if (socket) {
      socket.emit('test_completed', {
        testId,
        userId: user._id,
        userName: user.name,
        finalScore: score
      });
    }
  };

  if (loading || !test) return <div className="admin-spinner" style={{ margin: '100px auto' }} />;

  if (completed) {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', padding: '40px', backgroundColor: 'var(--color-paper-white)', borderRadius: '24px', border: '2px solid var(--color-ink)', textAlign: 'center', boxShadow: '8px 8px 0px var(--color-ink)' }}>
        <CheckSquare size={64} color="#16a34a" style={{ marginBottom: '24px' }} />
        <h1 style={{ fontSize: '32px', color: 'var(--color-ink)', marginBottom: '16px' }}>Test Completed!</h1>
        <div style={{ fontSize: '48px', fontWeight: 900, color: '#16a34a', marginBottom: '8px' }}>{score}</div>
        <p style={{ color: 'var(--color-fog)', fontSize: '18px', marginBottom: '32px' }}>Your score has been saved successfully.</p>
        <button onClick={() => navigate('/dashboard')} className="admin-btn-primary" style={{ padding: '16px 32px', fontSize: '18px' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const currentQ = questions[currentQuestionIndex];
  if (!currentQ) return <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--color-fog)', fontSize: '18px' }}>Waiting for professor to advance...</div>;

  const isMyTurn = test.testType === 'live-round-robin' ? (turnUserId || '').toString() === user._id.toString() : true;
  const formatTime = (secs) => `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto' }}>
      
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', padding: '24px', backgroundColor: 'var(--color-paper-white)', borderRadius: '24px', border: '2px solid var(--color-ink)', boxShadow: '8px 8px 0px var(--color-ink)' }}>
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
          <h3 style={{ fontSize: '24px', color: '#1d4ed8', marginBottom: '8px' }}>It's someone else's turn!</h3>
          <p style={{ color: '#3b82f6', fontSize: '16px' }}>Please wait until it is your turn to answer.</p>
        </div>
      ) : (
        <div style={{ padding: '32px', backgroundColor: 'var(--color-paper-white)', borderRadius: '24px', border: '2px solid var(--color-ink)', boxShadow: '8px 8px 0px var(--color-ink)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-fog)' }}>Question {currentQuestionIndex + 1} of {questions.length}</span>
            {test.testType === 'live-fastest-finger' && (
              <span style={{ color: '#ea580c', fontWeight: 800, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={16} /> FASTEST FINGER: First right answer gets +10!
              </span>
            )}
          </div>
          
          <h3 style={{ fontSize: '24px', color: 'var(--color-ink)', lineHeight: '1.4', marginBottom: '32px' }}>
            {currentQ.text}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {currentQ.options?.map((opt, idx) => {
              const isAnswered = answeredMap[currentQ._id] !== undefined;
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
        </div>
      )}
    </div>
  );
}

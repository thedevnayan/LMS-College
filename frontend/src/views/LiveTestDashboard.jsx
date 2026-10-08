'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { testsAPI, SOCKET_URL } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { io } from 'socket.io-client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { PlayCircle, Users, Trophy, FastForward, CheckCircle2, WifiOff, Wifi, QrCode, X, Zap } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function LiveTestDashboard() {
  const { testId } = useParams();
  const { user } = useAuth();
  const router = useRouter();

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  
  const [students, setStudents] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [testStarted, setTestStarted] = useState(false);
  const [turnUserId, setTurnUserId] = useState(null);
  const [showQR, setShowQR] = useState(false);

  // ── Fetch full live state from DB (survives refresh/disconnect) ──
  const restoreState = async () => {
    try {
      const res = await testsAPI.getLiveState(testId);
      if (res.success) {
        const { test: testData, currentQuestionIndex: qi, turnUserId: tu, liveStatus, students: dbStudents } = res.data;
        setTest(testData);
        setCurrentQuestionIndex(qi);
        setTurnUserId(tu);
        setTestStarted(liveStatus === 'in-progress');
        
        // Merge DB students with any currently in-memory
        setStudents(prev => {
          const merged = [...dbStudents];
          prev.forEach(p => {
            if (!merged.find(m => m.userId.toString() === p.userId.toString())) {
              merged.push(p);
            }
          });
          return merged;
        });
      }
    } catch (err) {
      console.error('Failed to restore live state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    restoreState();
  }, [testId]);

  // ── Socket connection with auto-reconnect ──
  useEffect(() => {
    if (!user || !testId) return;

    const newSocket = io(SOCKET_URL, {
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
        role: 'professor'
      });
      // Re-fetch state from DB on every reconnect to stay in sync
      restoreState();
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('user_joined', (data) => {
      if (data.role === 'student') {
        setStudents(prev => {
          if (!prev.find(s => s.userId.toString() === data.userId.toString())) {
            return [...prev, { ...data, score: 0, answers: [], completed: false }];
          }
          return prev;
        });
      }
    });

    newSocket.on('student_answered', (data) => {
      setStudents(prev => prev.map(s => {
        if (s.userId.toString() === data.userId.toString()) {
          return {
            ...s,
            score: data.currentScore,
            answers: [...(s.answers || []), { questionId: data.questionId, isCorrect: data.isCorrect, points: data.points }]
          };
        }
        return s;
      }));

      // Interactive Game-like Toasts
      if (data.isCorrect) {
        if (test?.testType === 'live-fastest-finger' && data.points > 0) {
          toast.success(`🔥 FASTEST FINGER: ${data.userName} secured ${data.points} points!`, {
            style: { backgroundColor: '#fff7ed', color: '#ea580c', border: '2px solid #ea580c', fontSize: '16px', fontWeight: 800 }
          });
        } else if (test?.testType === 'live-round-robin') {
          toast.success(`✅ ${data.userName} answered correctly!`, {
            style: { backgroundColor: '#f0fdf4', color: '#16a34a', border: '2px solid #16a34a', fontSize: '16px', fontWeight: 800 }
          });
        }
      } else {
        if (test?.testType === 'live-round-robin') {
          toast.error(`❌ ${data.userName} missed the mark!`, {
            style: { backgroundColor: '#fef2f2', color: '#dc2626', border: '2px solid #dc2626', fontSize: '16px', fontWeight: 800 }
          });
        }
      }
    });

    newSocket.on('student_completed', (data) => {
      setStudents(prev => prev.map(s => {
        if (s.userId.toString() === data.userId.toString()) {
          return { ...s, completed: true, score: data.finalScore };
        }
        return s;
      }));
    });

    return () => newSocket.disconnect();
  }, [testId, user, test?.testType]);

  const handleStartTest = async () => {
    try {
      await testsAPI.update(testId, { liveStatus: 'in-progress' });
      setTestStarted(true);
      socket.emit('start_test', { testId });
      
      if (test.testType === 'live-round-robin' && students.length > 0) {
        const randomStudent = students[Math.floor(Math.random() * students.length)];
        setTurnUserId(randomStudent.userId);
        socket.emit('next_question', { testId, nextQuestionIndex: 0, turnUserId: randomStudent.userId });
        toast.info(`🎲 Randomly selected ${randomStudent.userName} to start!`, { style: { fontWeight: 800 } });
      } else {
        toast.success(`🏁 Test Started!`, { style: { fontWeight: 800 } });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNextQuestion = () => {
    const nextIdx = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIdx);
    
    let nextTurn = null;
    if (test.testType === 'live-round-robin' && students.length > 0) {
      const randomStudent = students[Math.floor(Math.random() * students.length)];
      nextTurn = randomStudent.userId;
      setTurnUserId(nextTurn);
      toast.info(`🎲 It's ${randomStudent.userName}'s turn!`, { style: { fontWeight: 800 } });
    }
    
    socket.emit('next_question', { testId, nextQuestionIndex: nextIdx, turnUserId: nextTurn });
  };

  if (loading || !test) return <div className="admin-spinner" style={{ margin: '100px auto' }} />;

  const chartData = students.map(s => ({
    name: (s.userName || 'Student').split(' ')[0],
    score: s.score
  })).sort((a, b) => b.score - a.score);

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* QR Code Modal for Guest Join */}
      {showQR && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'var(--color-paper-white)', padding: '32px', borderRadius: '24px', border: '2px solid var(--color-ink)', boxShadow: '8px 8px 0px var(--color-ink)', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', margin: 0 }}>Guest Join QR</h3>
              <button onClick={() => setShowQR(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '16px', display: 'inline-block', marginBottom: '24px', border: '2px solid var(--color-ink)' }}>
              <QRCodeSVG 
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/test/guest-join/${test.sessionToken}`} 
                size={250} 
                level="M" 
                includeMargin={true}
              />
            </div>
            <p style={{ fontSize: '14px', color: 'var(--color-fog)', wordBreak: 'break-all' }}>
              {`${typeof window !== 'undefined' ? window.location.origin : ''}/test/guest-join/${test.sessionToken}`}
            </p>
          </div>
        </div>
      )}
      
      {/* Connection status indicator */}
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', color: 'var(--color-ink)', letterSpacing: '-1px', marginBottom: '8px' }}>
            Live Test: {test.title}
          </h1>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ padding: '4px 12px', backgroundColor: 'var(--color-ink)', color: 'white', borderRadius: '12px', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>
              {test.testType.replace('-', ' ')}
            </span>
            <span style={{ color: 'var(--color-fog)', fontWeight: 600 }}>
              Join Code: <strong style={{ color: 'var(--color-ink)', fontSize: '20px', letterSpacing: '2px' }}>{test.joinCode || 'NONE'}</strong>
            </span>
            {test.sessionToken && (
              <button 
                onClick={() => setShowQR(true)}
                className="admin-btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', fontSize: '14px' }}
              >
                <QrCode size={16} /> Guest Link
              </button>
            )}
          </div>
        </div>
        
        {!testStarted ? (
          <button 
            onClick={handleStartTest}
            className="admin-btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 32px', fontSize: '20px', backgroundColor: 'var(--color-sun-yellow)', color: 'var(--color-ink)' }}
          >
            <PlayCircle size={24} /> Start Test Now
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '12px' }}>
            {(test.testType === 'live-fastest-finger' || test.testType === 'live-round-robin') && (
              <button 
                onClick={handleNextQuestion}
                disabled={currentQuestionIndex >= test.questions.length - 1}
                className="admin-btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '16px' }}
              >
                <FastForward size={20} /> Next Question
              </button>
            )}
            <button 
              className="admin-btn-primary"
              style={{ backgroundColor: '#fee2e2', color: '#991b1b', borderColor: '#991b1b' }}
              onClick={async () => {
                await testsAPI.update(testId, { liveStatus: 'ended', status: 'completed' });
                router.push(`/admin/tests/${testId}/report`);
              }}
            >
              End Test
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Main Dashboard Chart */}
          <div style={{ backgroundColor: 'var(--color-paper-white)', padding: '24px', borderRadius: '24px', border: '2px solid var(--color-ink)', boxShadow: '8px 8px 0px var(--color-ink)' }}>
            <h3 style={{ fontSize: '20px', color: 'var(--color-ink)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={20} color="#d97706" /> Live Leaderboard
            </h3>
            <div style={{ width: '100%', height: '350px' }}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-fog)', fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-fog)', fontWeight: 600 }} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: '2px solid var(--color-ink)', boxShadow: '4px 4px 0px var(--color-ink)', fontWeight: 700 }} />
                    <Bar dataKey="score" radius={[8, 8, 0, 0]} animationDuration={1000} animationEasing="ease-out">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 && entry.score > 0 ? '#fbbf24' : index === 1 && entry.score > 0 ? '#94a3b8' : index === 2 && entry.score > 0 ? '#b45309' : 'var(--color-ink)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-fog)' }}>
                  No students joined yet.
                </div>
              )}
            </div>
          </div>

          {/* Test Status info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div style={{ padding: '24px', backgroundColor: '#eff6ff', borderRadius: '24px', border: '2px solid var(--color-ink)' }}>
               <h4 style={{ color: '#1d4ed8', margin: '0 0 8px 0' }}>Question Progress</h4>
               <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--color-ink)' }}>{currentQuestionIndex + 1} / {test.questions?.length}</div>
            </div>
            {test.testType === 'live-round-robin' && (
              <div style={{ padding: '24px', backgroundColor: '#fef2f2', borderRadius: '24px', border: '2px solid var(--color-ink)' }}>
                 <h4 style={{ color: '#b91c1c', margin: '0 0 8px 0' }}>Current Turn</h4>
                 <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--color-ink)' }}>
                   {students.find(s => s.userId.toString() === (turnUserId || '').toString())?.userName || 'None'}
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Joined Students */}
        <div style={{ backgroundColor: 'var(--color-paper-white)', padding: '24px', borderRadius: '24px', border: '2px solid var(--color-ink)', boxShadow: '8px 8px 0px var(--color-ink)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '20px', color: 'var(--color-ink)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} /> Students ({students.length})
          </h3>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '8px' }}>
            {students.length === 0 ? (
              <p style={{ color: 'var(--color-fog)', textAlign: 'center', marginTop: '40px' }}>Waiting for students to join...</p>
            ) : (
              <AnimatePresence>
                {students.map(s => (
                  <motion.div 
                    key={s.userId} 
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--color-warm-linen)', borderRadius: '12px', border: '1px solid var(--color-ink)' }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--color-ink)' }}>{s.userName}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, color: '#10b981' }}>{s.score} pts</span>
                      {s.completed && <CheckCircle2 size={16} color="#10b981" />}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

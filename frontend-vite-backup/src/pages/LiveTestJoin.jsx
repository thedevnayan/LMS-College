import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { testsAPI } from '../services/api';
import { ArrowRight, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';

export default function LiveTestJoin() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joinedTest, setJoinedTest] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!code) return;
    setLoading(true);
    setError('');
    
    try {
      const res = await testsAPI.verifyJoinCode(code);
      if (res.success) {
        setJoinedTest(res.data);
        
        // Initialize Socket
        const newSocket = io('http://localhost:5000');
        setSocket(newSocket);
        
        newSocket.emit('join_test', { 
          testId: res.data.testId, 
          userId: user._id, 
          userName: user.name, 
          role: 'student' 
        });

        newSocket.on('test_started', () => {
          navigate(`/live-test/${res.data.testId}`);
        });
      }
    } catch (err) {
      setError(err.message || 'Invalid join code or you are not enrolled.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '32px', backgroundColor: 'var(--color-paper-white)', borderRadius: '24px', border: '2px solid var(--color-ink)', boxShadow: '8px 8px 0px var(--color-ink)', textAlign: 'center' }}>
      
      {!joinedTest ? (
        <>
          <h1 style={{ fontSize: '28px', color: 'var(--color-ink)', marginBottom: '8px', letterSpacing: '-1px' }}>
            Join Live Test
          </h1>
          <p style={{ color: 'var(--color-fog)', marginBottom: '32px' }}>
            Enter the 6-character code provided by your professor.
          </p>

          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. A1B2C3"
              maxLength={6}
              style={{
                padding: '16px',
                fontSize: '24px',
                textAlign: 'center',
                letterSpacing: '4px',
                textTransform: 'uppercase',
                borderRadius: '12px',
                border: '2px solid var(--color-ink)',
                outline: 'none',
                fontWeight: 800
              }}
            />
            {error && <div style={{ color: '#991b1b', fontSize: '14px', fontWeight: 600 }}>{error}</div>}
            
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="admin-btn-primary"
              style={{ padding: '16px', fontSize: '18px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              {loading ? 'Verifying...' : 'Join Room'}
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>
        </>
      ) : (
        <>
          <div style={{ display: 'inline-flex', padding: '24px', backgroundColor: '#dcfce7', borderRadius: '50%', marginBottom: '24px', border: '2px solid var(--color-ink)' }}>
            <CheckCircle size={48} color="#16a34a" />
          </div>
          <h2 style={{ fontSize: '24px', color: 'var(--color-ink)', marginBottom: '8px' }}>
            You're in!
          </h2>
          <div style={{ padding: '16px', backgroundColor: 'var(--color-warm-linen)', borderRadius: '12px', border: '2px solid var(--color-ink)', marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', color: 'var(--color-fog)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Test Topic</div>
            <div style={{ fontSize: '20px', color: 'var(--color-ink)', fontWeight: 800 }}>{joinedTest.title}</div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--color-fog)' }}>
            <Clock size={20} />
            <span style={{ fontSize: '16px', fontWeight: 500 }}>Waiting for professor to start the test...</span>
          </div>
          <div className="admin-spinner" style={{ margin: '32px auto 0', width: '32px', height: '32px', borderTopColor: 'var(--color-ink)' }}></div>
        </>
      )}
    </div>
  );
}

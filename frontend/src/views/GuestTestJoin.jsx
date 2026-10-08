'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { testsAPI } from '@/services/api';
import { PlayCircle, User, AlertTriangle } from 'lucide-react';

export default function GuestTestJoin() {
  const { sessionToken } = useParams();
  const router = useRouter();

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [guestName, setGuestName] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        // Fetch test details without auth
        const res = await testsAPI.getGuestLiveState(sessionToken);
        if (res.success) {
          setTest(res.data.test);
          
          // If we already have a guestId in localStorage for this test, redirect to the attempt
          const existingGuestId = localStorage.getItem(`guestId_${sessionToken}`);
          if (existingGuestId) {
            router.push(`/test/guest-test/${sessionToken}/attempt`);
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load test session');
      } finally {
        setLoading(false);
      }
    };
    if (sessionToken) {
      fetchTest();
    }
  }, [sessionToken, router]);

  const handleJoinTest = async (e) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    
    setJoining(true);
    setError('');
    
    try {
      // Generate a new UUID for the guest
      const guestId = 'guest_' + Math.random().toString(36).substring(2, 15);
      
      const res = await testsAPI.joinGuestTest({
        sessionToken,
        guestName,
        guestId
      });
      
      if (res.success) {
        // Store guestId in localStorage so they can reconnect if they refresh
        localStorage.setItem(`guestId_${sessionToken}`, guestId);
        localStorage.setItem(`guestName_${sessionToken}`, guestName);
        
        // Redirect to the actual test
        router.push(`/test/guest-test/${sessionToken}/attempt`);
      }
    } catch (err) {
      setError(err.message || 'Failed to join test');
      setJoining(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-fog)' }}>Loading test session...</div>;
  }

  if (error && !test) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <AlertTriangle size={48} color="#dc2626" style={{ margin: '0 auto 16px' }} />
        <div style={{ color: '#991b1b', fontSize: '20px', fontWeight: 600 }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '20px' }}>
      <div style={{ backgroundColor: 'var(--color-paper-white)', padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '500px', border: '2px solid var(--color-ink)', boxShadow: '8px 8px 0px var(--color-ink)', textAlign: 'center' }}>
        
        <div style={{ display: 'inline-block', padding: '6px 16px', backgroundColor: 'var(--color-sun-yellow)', borderRadius: '12px', fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '24px' }}>
          Guest Session
        </div>
        
        <h1 style={{ fontSize: '28px', color: 'var(--color-ink)', fontWeight: 900, marginBottom: '8px' }}>
          {test?.title || 'Live Test'}
        </h1>
        <p style={{ color: 'var(--color-fog)', fontSize: '16px', marginBottom: '32px' }}>
          Please enter your name to join this test.
        </p>

        {error && (
          <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '12px', marginBottom: '24px', fontSize: '14px', fontWeight: 500, border: '1px solid #fca5a5' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleJoinTest} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ position: 'relative' }}>
            <User size={20} color="var(--color-fog)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Your Full Name" 
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              required
              className="admin-input"
              style={{ width: '100%', padding: '16px 16px 16px 48px', fontSize: '18px' }}
            />
          </div>

          <button 
            type="submit"
            disabled={joining || !guestName.trim()}
            className="admin-btn-primary"
            style={{ padding: '20px', fontSize: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', opacity: joining || !guestName.trim() ? 0.7 : 1, cursor: joining || !guestName.trim() ? 'not-allowed' : 'pointer' }}
          >
            <PlayCircle size={24} />
            {joining ? 'Joining...' : 'Join Test'}
          </button>
        </form>
        
      </div>
    </div>
  );
}

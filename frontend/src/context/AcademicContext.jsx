'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { academicAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const AcademicContext = createContext(null);

export function AcademicProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await academicAPI.getSessions();
      if (res.success && Array.isArray(res.data)) {
        setSessions(res.data);
        // Default to current active session or first session
        const current = res.data.find(s => s.isCurrent) || res.data.find(s => s.status === 'Active') || res.data[0];
        if (current) {
          setActiveSession(prev => prev || current);
        }
      }
    } catch (err) {
      console.error('Failed to fetch academic sessions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Only fetch sessions once auth is resolved and user is authenticated
  useEffect(() => {
    if (authLoading) return;

    if (isAuthenticated) {
      fetchSessions();
    } else {
      // User logged out — reset state
      setSessions([]);
      setActiveSession(null);
      setLoading(false);
    }
  }, [isAuthenticated, authLoading, fetchSessions]);

  const switchSession = (sessionId) => {
    const found = sessions.find(s => s._id === sessionId);
    if (found) {
      setActiveSession(found);
    }
  };

  return (
    <AcademicContext.Provider
      value={{
        sessions,
        activeSession,
        setActiveSession,
        switchSession,
        refreshSessions: fetchSessions,
        loading,
      }}
    >
      {children}
    </AcademicContext.Provider>
  );
}

export const useAcademic = () => {
  const context = useContext(AcademicContext);
  if (!context) {
    throw new Error('useAcademic must be used within an AcademicProvider');
  }
  return context;
};

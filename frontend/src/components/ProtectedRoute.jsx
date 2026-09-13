'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute({ children, role }) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/admin/login');
    } else if (!loading && role && user?.role !== role) {
      router.replace('/');
    }
  }, [loading, isAuthenticated, user, role, router]);

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-charcoal)',
      }}>
        <div className="admin-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (role && user.role !== role) {
    return null;
  }

  return children;
}

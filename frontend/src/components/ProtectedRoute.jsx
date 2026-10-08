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
    } else if (!loading && role) {
      const allowedRoles = Array.isArray(role) ? role : [role];
      const isFacultyRoute = allowedRoles.some((r) => ['admin', 'professor', 'teacher'].includes(r));
      if (isFacultyRoute) {
        if (!['admin', 'professor', 'teacher'].includes(user?.role)) {
          router.replace('/admin/login');
        }
      } else if (!allowedRoles.includes(user?.role)) {
        router.replace('/');
      }
    }
  }, [loading, isAuthenticated, user, role, router]);

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-warm-linen)',
      }}>
        <div className="admin-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (role) {
    const allowedRoles = Array.isArray(role) ? role : [role];
    const isFacultyRoute = allowedRoles.some((r) => ['admin', 'professor', 'teacher'].includes(r));
    if (isFacultyRoute) {
      if (!['admin', 'professor', 'teacher'].includes(user?.role)) return null;
    } else if (!allowedRoles.includes(user?.role)) {
      return null;
    }
  }

  return children;
}

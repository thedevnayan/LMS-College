'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import StudentLayoutComponent from '@/components/StudentLayout';

export default function StudentRouteLayout({ children }) {
  return (
    <ProtectedRoute role="student">
      <StudentLayoutComponent>
        {children}
      </StudentLayoutComponent>
    </ProtectedRoute>
  );
}

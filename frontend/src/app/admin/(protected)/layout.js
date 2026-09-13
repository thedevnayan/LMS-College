'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayoutComponent from '@/components/AdminLayout';

export default function AdminRouteLayout({ children }) {
  return (
    <ProtectedRoute role="professor">
      <AdminLayoutComponent>
        {children}
      </AdminLayoutComponent>
    </ProtectedRoute>
  );
}

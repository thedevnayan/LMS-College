import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
import Landing from './pages/Landing';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import CreateClassroom from './pages/CreateClassroom';
import ClassroomDetail from './pages/ClassroomDetail';
import AssignmentsList from './pages/AssignmentsList';
import AssignmentBuilder from './pages/AssignmentBuilder';
import AssignmentReport from './pages/AssignmentReport';
import MaterialsList from './pages/MaterialsList';
import MaterialBuilder from './pages/MaterialBuilder';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Admin Panel (Professor only) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="professor">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="classrooms/new" element={<CreateClassroom />} />
            <Route path="classrooms/:id" element={<ClassroomDetail />} />
            <Route path="assignments" element={<AssignmentsList />} />
            <Route path="assignments/new" element={<AssignmentBuilder />} />
            <Route path="assignments/:id/edit" element={<AssignmentBuilder />} />
            <Route path="assignments/:id/report" element={<AssignmentReport />} />
            <Route path="materials" element={<MaterialsList />} />
            <Route path="materials/new" element={<MaterialBuilder />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

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
import TestsList from './pages/TestsList';
import TestBuilder from './pages/TestBuilder';
import AdminStudentsList from './pages/AdminStudentsList';
import AdminStudentProfile from './pages/AdminStudentProfile';

import StudentLogin from './pages/StudentLogin';
import StudentRegister from './pages/StudentRegister';
import StudentLayout from './components/StudentLayout';
import StudentDashboard from './pages/StudentDashboard';
import StudentClassroomDetail from './pages/StudentClassroomDetail';
import StudentMaterialView from './pages/StudentMaterialView';
import StudentAssignmentView from './pages/StudentAssignmentView';
import StudentTestJoin from './pages/StudentTestJoin';
import LiveTestJoin from './pages/LiveTestJoin';
import LiveTestAttempt from './pages/LiveTestAttempt';
import LiveTestDashboard from './pages/LiveTestDashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          
          <Route path="/login" element={<StudentLogin />} />
          <Route path="/register" element={<StudentRegister />} />

          {/* Student Portal */}
          <Route
            path="/"
            element={
              <ProtectedRoute role="student">
                <StudentLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="join-test" element={<LiveTestJoin />} />
            <Route path="classrooms/:id" element={<StudentClassroomDetail />} />
            <Route path="classrooms/:classroomId/materials/:materialId" element={<StudentMaterialView />} />
            <Route path="classrooms/:classroomId/assignments/:assignmentId" element={<StudentAssignmentView />} />
            <Route path="classrooms/:classroomId/tests/:testId/join" element={<StudentTestJoin />} />
            <Route path="live-test/:testId" element={<LiveTestAttempt />} />
            {/* Additional student routes will go here later */}
          </Route>

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
            <Route path="tests" element={<TestsList />} />
            <Route path="tests/new" element={<TestBuilder />} />
            <Route path="tests/:id/edit" element={<TestBuilder />} />
            <Route path="live-test/:testId/dashboard" element={<LiveTestDashboard />} />
            <Route path="students" element={<AdminStudentsList />} />
            <Route path="students/:id" element={<AdminStudentProfile />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

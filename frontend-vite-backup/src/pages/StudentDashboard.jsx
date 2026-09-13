import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { assignmentsAPI, testsAPI } from '../services/api';
import { BookOpen, GraduationCap, Clock } from 'lucide-react';
import StudentClassroomList from './StudentClassroomList';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { classrooms } = useOutletContext();
  
  const [pendingAssignments, setPendingAssignments] = useState([]);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!classrooms || classrooms.length === 0) return;
      try {
        let pending = [];
        await Promise.all(
          classrooms.map(async (c) => {
            const [assRes, testRes] = await Promise.all([
              assignmentsAPI.listByClassroom(c._id),
              testsAPI.listByClassroom(c._id)
            ]);

            if (assRes.success) {
              const unsubmitted = assRes.data.filter(a => a.submissionStatus === 'unsubmitted');
              unsubmitted.forEach(a => {
                a.classroomName = c.name || c.courseId?.title || 'Classroom';
                a.classroomId = c._id;
                a.taskType = 'assignment';
                // Assignments use dueDate for sorting, tests might not have one, but we'll adapt.
              });
              pending = [...pending, ...unsubmitted];
            }

            if (testRes.success) {
              const pendingTests = testRes.data.filter(t => t.attemptStatus === 'unattempted' && t.status !== 'completed');
              pendingTests.forEach(t => {
                t.classroomName = c.name || c.courseId?.title || 'Classroom';
                t.classroomId = c._id;
                t.taskType = 'test';
                t.dueDate = t.createdAt; // Just for sorting, use createdAt if no due date
              });
              pending = [...pending, ...pendingTests];
            }
          })
        );
        pending.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        setPendingAssignments(pending);
      } catch (err) {
        console.error('Failed to fetch tasks', err);
      }
    };
    fetchTasks();
  }, [classrooms]);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '32px', color: 'var(--color-ink)', fontWeight: 800, letterSpacing: '-1px', marginBottom: '8px' }}>
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p style={{ color: 'var(--color-fog)', fontSize: '16px' }}>Ready to conquer today's classes?</p>
        </div>
        <div style={{ padding: '16px', backgroundColor: 'var(--color-sun-yellow)', borderRadius: '20px', border: '2px solid var(--color-ink)', boxShadow: '4px 4px 0px var(--color-ink)' }}>
          <GraduationCap size={32} color="var(--color-ink)" />
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        
        <div style={{ backgroundColor: 'var(--color-paper-white)', padding: '24px', borderRadius: '20px', border: '2px solid var(--color-ink)', boxShadow: '4px 4px 0px var(--color-ink)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ padding: '10px', backgroundColor: '#e0e7ff', borderRadius: '12px' }}>
              <BookOpen size={24} color="#4f46e5" />
            </div>
            <h3 style={{ fontSize: '18px', color: 'var(--color-ink)', fontWeight: 700 }}>Active Subjects</h3>
          </div>
          <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--color-ink)' }}>{classrooms ? classrooms.length : 0}</div>
          <div style={{ color: 'var(--color-fog)', fontSize: '14px', marginTop: '4px' }}>Active subjects</div>
        </div>

        <div style={{ backgroundColor: 'var(--color-paper-white)', padding: '24px', borderRadius: '20px', border: '2px solid var(--color-ink)', boxShadow: '4px 4px 0px var(--color-ink)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ padding: '10px', backgroundColor: '#fee2e2', borderRadius: '12px' }}>
              <Clock size={24} color="#dc2626" />
            </div>
            <h3 style={{ fontSize: '18px', color: 'var(--color-ink)', fontWeight: 700 }}>Pending Tasks</h3>
          </div>
          <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--color-ink)' }}>{pendingAssignments.length}</div>
          <div style={{ color: 'var(--color-fog)', fontSize: '14px', marginTop: '4px' }}>Assignments to complete</div>
        </div>

      </div>

      {/* Upcoming Tasks Section (Only show if there are pending tasks) */}
      {pendingAssignments.length > 0 && (
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '24px', color: 'var(--color-ink)', fontWeight: 800, marginBottom: '24px' }}>Upcoming Deadlines</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {pendingAssignments.slice(0, 3).map(task => (
              <div key={task._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', backgroundColor: 'var(--color-paper-white)', borderRadius: '16px', border: '2px solid var(--color-ink)', boxShadow: '4px 4px 0px var(--color-ink)' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-ink)', marginBottom: '4px' }}>{task.title}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-fog)', fontSize: '13px', fontWeight: 600 }}>
                    {task.taskType === 'assignment' ? (
                      <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> Due: {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <span style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <BookOpen size={12} /> Test / Quiz
                      </span>
                    )}
                    <span>•</span>
                    <span>{task.classroomName}</span>
                  </div>
                </div>
                <a 
                  href={task.taskType === 'assignment' ? `/classrooms/${task.classroomId}/assignments/${task._id}` : `/classrooms/${task.classroomId}/tests/${task._id}/join`}
                  style={{ padding: '8px 16px', backgroundColor: 'var(--color-ink)', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px' }}
                >
                  Start
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Classrooms List */}
      <StudentClassroomList />

    </div>
  );
}

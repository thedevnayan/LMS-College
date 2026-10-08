'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { StudentDataProvider } from '@/context/StudentDataContext';
import { authAPI, classroomsAPI, removeToken, SOCKET_URL } from '@/services/api';
import { io } from 'socket.io-client';
import {
  LayoutDashboard, BookOpen, Clock, LogOut, User, Loader2, Search,
  CheckCircle2, FlaskConical, Zap, GraduationCap, QrCode
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

export default function StudentLayout({ children }) {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [classrooms, setClassrooms] = useState([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);

  const fetchClassrooms = async () => {
    try {
      setLoadingClassrooms(true);
      const res = await classroomsAPI.list();
      if (res.success) {
        setClassrooms(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch classrooms', err);
    } finally {
      setLoadingClassrooms(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  // Socket setup for real-time notifications
  useEffect(() => {
    if (!classrooms.length) return;
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    
    socket.on('connect', () => {
      classrooms.forEach(c => {
        socket.emit('join_classroom', c._id);
      });
    });

    socket.on('new_test_published', (data) => {
      import('sonner').then(({ toast }) => {
        toast.success(data.message || 'A new test is available!', {
          action: {
            label: 'Join Test',
            onClick: () => router.push(`/classrooms/${data.classroomId}/tests/${data.testId}/join`)
          },
          duration: 20000,
        });
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [classrooms, router]);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      removeToken();
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed', error);
      removeToken();
      setUser(null);
      router.push('/login');
    }
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Classrooms', path: '/classrooms', icon: BookOpen },
    { name: 'Academic History', path: '/history', icon: GraduationCap },
  ];

  const needsToJoin = !loadingClassrooms && classrooms.length === 0;

  return (
    <StudentDataProvider value={{ classrooms, loadingClassrooms }}>
      <div className="student-layout" style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-warm-linen)' }}>
        {/* No classrooms prompt — tells student to scan QR */}
        {needsToJoin && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 15, 18, 0.8)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
            padding: '20px',
          }}>
            <div style={{
              backgroundColor: 'var(--color-paper-white)', padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '440px',
              border: '2px solid var(--color-ink)', boxShadow: '8px 8px 0px var(--color-ink)', textAlign: 'center',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                <div style={{ padding: '16px', backgroundColor: 'var(--color-sun-yellow)', borderRadius: '18px', border: '2px solid var(--color-ink)', boxShadow: '3px 3px 0 var(--color-ink)' }}>
                  <QrCode size={36} color="var(--color-ink)" />
                </div>
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-ink)', marginBottom: '8px' }}>
                Welcome to LMS!
              </h2>
              <p style={{ color: 'var(--color-fog)', fontSize: '14px', marginBottom: '8px', lineHeight: 1.5 }}>
                To join your classes, scan the <strong>QR code</strong> shared by your professor.
              </p>
              <p style={{ color: 'var(--color-fog)', fontSize: '13px', marginBottom: '24px', lineHeight: 1.5 }}>
                The QR code will automatically enroll you in all your semester classes.
              </p>
              <div style={{
                padding: '16px',
                backgroundColor: 'var(--color-warm-linen)',
                borderRadius: '12px',
                border: '1px solid var(--color-stone)',
                fontSize: '13px',
                color: 'var(--color-charcoal)',
                lineHeight: 1.5,
              }}>
                💡 <strong>Tip:</strong> Open your phone camera and point it at the QR code your teacher displayed in class or shared on the group.
              </div>
            </div>
          </div>
        )}

        {/* Global Toast Notifications */}
        <Toaster position="bottom-right" richColors toastOptions={{ style: { padding: '16px', borderRadius: '12px', border: '2px solid var(--color-ink)', boxShadow: '4px 4px 0px var(--color-ink)' } }} />

        {/* Sidebar */}
        <aside className="student-sidebar" style={{
          width: '260px',
          backgroundColor: 'var(--color-paper-white)',
          borderRight: '2px solid var(--color-ink)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 100
        }}>
          {/* Brand */}
          <div style={{ padding: '24px', borderBottom: '2px solid var(--color-ink)' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--color-ink)', letterSpacing: '-1px' }}>Skedio</h2>
            <div style={{ fontSize: '13px', color: 'var(--color-fog)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>
              Student Portal
            </div>
          </div>

          {/* Navigation */}
          <nav style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.path || pathname.startsWith(link.path + '/');
              return (
                <Link
                  key={link.name}
                  href={link.path}
                  className={`admin-nav-link ${isActive ? 'active' : ''}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px',
                    color: 'var(--color-fog)', textDecoration: 'none', fontWeight: 600, transition: 'all 0.2s'
                  }}
                >
                  <Icon size={20} />
                  {link.name}
                </Link>
              );
            })}
          </nav>



          {/* User Profile & Logout */}
          <div className="user-profile-sec" style={{ padding: '24px', borderTop: '2px solid var(--color-ink)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'var(--color-sun-yellow)', border: '2px solid var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={20} color="var(--color-ink)" />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-ink)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user?.name || 'Student'}</div>
                <div style={{ fontSize: '13px', color: 'var(--color-fog)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user?.email}</div>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: 'transparent', border: '2px solid var(--color-fog)', borderRadius: '12px', color: 'var(--color-fog)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-ink)'; e.currentTarget.style.color = 'var(--color-ink)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-fog)'; e.currentTarget.style.color = 'var(--color-fog)'; }}
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="student-main" style={{ flex: 1, marginLeft: '260px', padding: '40px' }}>
          {children}
        </main>
      </div>
    </StudentDataProvider>
  );
}

import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI, classroomsAPI, removeToken } from '../services/api';
import { LayoutDashboard, BookOpen, Clock, LogOut, User, Loader2, Search } from 'lucide-react';
import { Toaster } from 'sonner';

export default function StudentLayout() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [classrooms, setClassrooms] = useState([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

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
    if (classrooms.length === 0) return;

    // We assume backend is running on the same host or VITE_API_URL is configured
    const socketUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';
    
    // Lazy load socket.io-client
    import('socket.io-client').then(({ io }) => {
      const socket = io(socketUrl);

      socket.on('connect', () => {
        classrooms.forEach(c => {
          socket.emit('join_classroom', c._id);
        });
      });

      socket.on('test_hosted', (data) => {
        import('sonner').then(({ toast }) => {
          toast.success(data.message || 'A new test is available!', {
            action: {
              label: 'Join Test',
              onClick: () => navigate(`/classrooms/${data.classroomId}/tests/${data.testId}/join`)
            },
            duration: 20000,
          });
        });
      });

      return () => {
        socket.disconnect();
      };
    });
  }, [classrooms, navigate]);

  const handleJoinClassroom = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    setJoinError('');
    try {
      const res = await classroomsAPI.join(joinCode);
      if (res.success) {
        setJoinCode('');
        await fetchClassrooms();
      }
    } catch (err) {
      setJoinError(err.message || 'Failed to join classroom');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      removeToken();
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed', error);
      removeToken();
      setUser(null);
      navigate('/login');
    }
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Classrooms', path: '/classrooms', icon: BookOpen },
    { name: 'Assignments', path: '/tasks', icon: Clock },
  ];

  const needsToJoin = !loadingClassrooms && classrooms.length === 0;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-warm-linen)' }}>
      {/* Join Classroom Gatekeeper Modal */}
      {needsToJoin && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 15, 18, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'var(--color-paper-white)', padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '440px',
            border: '2px solid var(--color-ink)', boxShadow: '8px 8px 0px var(--color-ink)', textAlign: 'center'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <div style={{ padding: '16px', backgroundColor: 'var(--color-sun-yellow)', borderRadius: '20px', border: '2px solid var(--color-ink)' }}>
                <Search size={32} color="var(--color-ink)" />
              </div>
            </div>
            <h2 style={{ fontSize: '24px', color: 'var(--color-ink)', marginBottom: '8px' }}>Welcome to LMS!</h2>
            <p style={{ color: 'var(--color-fog)', fontSize: '15px', marginBottom: '32px' }}>
              You aren't enrolled in any classes yet. Enter your professor's class code to get started.
            </p>

            {joinError && (
              <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '12px', marginBottom: '24px', fontSize: '14px', fontWeight: 500, border: '1px solid #fca5a5' }}>
                {joinError}
              </div>
            )}

            <form onSubmit={handleJoinClassroom} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input 
                type="text" 
                className="admin-input" 
                placeholder="Enter 6-digit class code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '4px', textTransform: 'uppercase' }}
                required
              />
              <button 
                type="submit" 
                disabled={joinLoading || joinCode.length < 6}
                className="admin-btn-primary"
                style={{ padding: '16px', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', opacity: (joinLoading || joinCode.length < 6) ? 0.7 : 1, cursor: (joinLoading || joinCode.length < 6) ? 'not-allowed' : 'pointer' }}
              >
                {joinLoading ? <Loader2 className="animate-spin" size={20} /> : <BookOpen size={20} />}
                Join Classroom
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Global Toast Notifications */}
      <Toaster position="bottom-right" richColors toastOptions={{ style: { padding: '16px', borderRadius: '12px', border: '2px solid var(--color-ink)', boxShadow: '4px 4px 0px var(--color-ink)' } }} />

      {/* Sidebar */}
      <aside style={{
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
            return (
              <NavLink
                key={link.name}
                to={link.path}
                className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px',
                  color: 'var(--color-fog)', textDecoration: 'none', fontWeight: 600, transition: 'all 0.2s'
                }}
              >
                <Icon size={20} />
                {link.name}
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div style={{ padding: '24px', borderTop: '2px solid var(--color-ink)' }}>
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
      <main style={{ flex: 1, marginLeft: '260px', padding: '40px' }}>
        <Outlet context={{ classrooms, loadingClassrooms }} />
      </main>
    </div>
  );
}

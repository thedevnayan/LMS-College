import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, BookOpen, Plus, LogOut, Menu, X, ChevronRight, GraduationCap, FileText
} from 'lucide-react';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const navItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/classrooms/new', icon: Plus, label: 'Create Class' },
    { to: '/admin/assignments', icon: BookOpen, label: 'Assignments' },
    { to: '/admin/materials', icon: FileText, label: 'Materials' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-warm-linen)' }}>
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 72 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        style={{
          backgroundColor: 'var(--color-paper-white)',
          borderRight: '1px solid var(--color-ink)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        {/* Logo Area */}
        <div style={{
          padding: sidebarOpen ? '24px 20px' : '24px 16px',
          borderBottom: '1px solid var(--color-ink)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minHeight: '72px',
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #ffde3b, #ff4dd5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <GraduationCap size={20} color="#0f0f12" strokeWidth={2.5} />
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                style={{
                  color: 'var(--color-ink)',
                  fontSize: 'var(--text-body-lg)',
                  letterSpacing: '-0.5px',
                  whiteSpace: 'nowrap',
                }}
              >
                LMS Admin
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: sidebarOpen ? '12px 14px' : '12px',
                borderRadius: '10px',
                textDecoration: 'none',
                color: isActive ? 'var(--color-ink)' : 'var(--color-fog)',
                backgroundColor: isActive ? 'rgba(0,0,0,0.05)' : 'transparent',
                transition: 'all 200ms ease',
                justifyContent: sidebarOpen ? 'flex-start' : 'center',
              })}
            >
              <item.icon size={20} strokeWidth={1.8} style={{ flexShrink: 0 }} />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{ fontSize: 'var(--text-body)', whiteSpace: 'nowrap' }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div style={{
          padding: '12px 8px',
          borderTop: '1px solid var(--color-ink)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          {/* User info */}
          {sidebarOpen && (
            <div style={{
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #b7c5ff, #c1f32b)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                color: '#0f0f12',
                fontWeight: 500,
                flexShrink: 0,
              }}>
                {user?.name?.charAt(0)?.toUpperCase() || 'P'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{
                  color: 'var(--color-ink)',
                  fontSize: 'var(--text-caption)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {user?.name || 'Professor'}
                </div>
                <div style={{
                  color: 'var(--color-fog)',
                  fontSize: 'var(--text-caption)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {user?.email}
                </div>
              </div>
            </div>
          )}

          {/* Collapse + Logout */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="admin-sidebar-btn"
            style={{ justifyContent: sidebarOpen ? 'flex-start' : 'center' }}
          >
            <ChevronRight
              size={18}
              style={{
                transform: sidebarOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 300ms ease',
                flexShrink: 0,
              }}
            />
            {sidebarOpen && <span>Collapse</span>}
          </button>
          <button
            onClick={handleLogout}
            className="admin-sidebar-btn"
            style={{
              color: 'var(--color-ink)',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
            }}
          >
            <LogOut size={18} style={{ flexShrink: 0 }} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          marginLeft: sidebarOpen ? '260px' : '72px',
          transition: 'margin-left 300ms cubic-bezier(0.23, 1, 0.32, 1)',
          minHeight: '100vh',
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}

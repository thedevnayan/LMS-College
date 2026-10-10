'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { GraduationCap, Eye, EyeOff, ArrowRight, AlertCircle, ShieldCheck, UserCheck } from 'lucide-react';
import Link from 'next/link';

export default function AdminLogin() {
  const { login, user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto redirect if already logged in with admin or faculty role
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin') {
        router.push('/admin/mis');
      } else if (['professor', 'teacher'].includes(user.role)) {
        router.push('/admin/dashboard');
      }
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      const role = res.data?.user?.role;
      if (role === 'student') {
        setError('Students must use the student portal to log in');
        setLoading(false);
        return;
      }
      if (role === 'admin') {
        router.push('/admin/mis');
      } else {
        router.push('/admin/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-warm-linen)',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background gradient orbs */}
      <div style={{
        position: 'absolute',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,222,59,0.08) 0%, transparent 70%)',
        top: '-200px',
        right: '-200px',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,77,213,0.06) 0%, transparent 70%)',
        bottom: '-150px',
        left: '-150px',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        style={{
          width: '100%',
          maxWidth: '460px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '32px',
          }}
        >
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #ffde3b, #ff4dd5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            border: '2px solid var(--color-ink)',
            boxShadow: '3px 3px 0 var(--color-ink)',
          }}>
            <GraduationCap size={32} color="#0f0f12" strokeWidth={2.5} />
          </div>
          <h1 style={{
            color: 'var(--color-ink)',
            fontSize: '24px',
            fontWeight: 800,
            letterSpacing: '-0.5px',
            marginBottom: '6px',
            textAlign: 'center',
          }}>
            College Admin & Faculty Portal
          </h1>
          <p style={{
            color: 'var(--color-fog)',
            fontSize: '14px',
            textAlign: 'center',
          }}>
            Sign in to access Institutional MIS, academics, and classrooms
          </p>
        </motion.div>


        {/* Login Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{
            backgroundColor: 'var(--color-paper-white)',
            borderRadius: '16px',
            padding: '32px',
            border: '2px solid var(--color-ink)',
            boxShadow: '5px 5px 0 var(--color-ink)',
          }}
        >
          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#ffebeb',
                border: '1px solid #ff4444',
                marginBottom: '20px',
                color: '#cc0000',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <AlertCircle size={16} />
              {error}
            </motion.div>
          )}

          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
            <label className="admin-label">
              Official Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@college.edu or prof@test.com"
              required
              className="admin-input"
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '24px' }}>
            <label className="admin-label">
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="admin-input"
                style={{ paddingRight: '48px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-fog)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              border: '2px solid var(--color-ink)',
              background: loading
                ? 'var(--color-paper-white)'
                : 'var(--color-sun-yellow)',
              color: 'var(--color-ink)',
              fontWeight: 800,
              fontSize: '15px',
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '3px 3px 0 var(--color-ink)',
            }}
          >
            {loading ? (
              <div className="admin-spinner-sm" />
            ) : (
              <>
                Sign In to College Panel
                <ArrowRight size={18} />
              </>
            )}
          </motion.button>
        </motion.form>

        {/* Footer link to student login */}
        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '13px',
          color: 'var(--color-fog)',
        }}>
          Are you a student?{' '}
          <Link href="/login" style={{ color: 'var(--color-ink)', fontWeight: 700, textDecoration: 'underline' }}>
            Go to Student Portal
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

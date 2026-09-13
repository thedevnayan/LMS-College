import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.data.user.role !== 'professor') {
        setError('Only teachers can access the admin panel');
        setLoading(false);
        return;
      }
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
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
          maxWidth: '420px',
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
            marginBottom: '40px',
          }}
        >
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #ffde3b, #ff4dd5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}>
            <GraduationCap size={28} color="#0f0f12" strokeWidth={2.5} />
          </div>
          <h1 style={{
            color: 'var(--color-ink)',
            fontSize: 'var(--text-subheading)',
            letterSpacing: 'var(--tracking-subheading)',
            marginBottom: '8px',
          }}>
            Teacher Admin Panel
          </h1>
          <p style={{
            color: 'var(--color-fog)',
            fontSize: 'var(--text-body)',
          }}>
            Sign in to manage your classrooms
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
            borderRadius: 'var(--radius-cards)',
            padding: '32px',
            border: '1px solid var(--color-ink)',
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
                borderRadius: 'var(--radius-cards)',
                backgroundColor: '#ffebeb',
                border: '1px solid #ff4444',
                marginBottom: '20px',
                color: '#cc0000',
                fontSize: 'var(--text-caption)',
              }}
            >
              <AlertCircle size={16} />
              {error}
            </motion.div>
          )}

          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
            <label className="admin-label">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="professor@college.edu"
              required
              className="admin-input"
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '28px' }}>
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
                minLength={8}
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
            whileTap={{ scale: 0.97 }}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 'var(--radius-buttons)',
              border: '1px solid var(--color-ink)',
              background: loading
                ? 'var(--color-paper-white)'
                : 'var(--color-sun-yellow)',
              color: 'var(--color-ink)',
              fontSize: 'var(--text-body)',
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'opacity 200ms ease',
            }}
          >
            {loading ? (
              <div className="admin-spinner-sm" />
            ) : (
              <>
                Sign In
                <ArrowRight size={18} />
              </>
            )}
          </motion.button>
        </motion.form>

        {/* Footer hint */}
        <p style={{
          textAlign: 'center',
          color: 'var(--color-fog)',
          fontSize: 'var(--text-caption)',
          marginTop: '24px',
        }}>
          Only faculty accounts can access this panel
        </p>
      </motion.div>
    </div>
  );
}

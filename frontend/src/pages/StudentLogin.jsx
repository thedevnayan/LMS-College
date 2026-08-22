import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI, setToken } from '../services/api';
import { GraduationCap, LogIn, Eye, EyeOff } from 'lucide-react';

export default function StudentLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      return setErrors(['Email and password are required.']);
    }
    
    setLoading(true);
    setErrors([]);
    
    try {
      const res = await login(formData.email, formData.password);
      if (res.success) {
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length > 0) {
        setErrors(Object.values(err.fields));
      } else {
        setErrors([err.message || 'Invalid email or password']);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-warm-linen)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
        <div style={{ backgroundColor: 'var(--color-ink)', padding: '12px', borderRadius: '16px', boxShadow: '4px 4px 0px var(--color-sun-yellow)' }}>
          <GraduationCap size={32} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: '28px', color: 'var(--color-ink)', fontWeight: 800, letterSpacing: '-0.5px' }}>Student Portal</h1>
          <p style={{ color: 'var(--color-fog)', fontSize: '15px' }}>Welcome back</p>
        </div>
      </div>

      {/* Form Card */}
      <div style={{ 
        backgroundColor: 'var(--color-paper-white)', width: '100%', maxWidth: '440px', padding: '40px',
        borderRadius: '24px', border: '2px solid var(--color-ink)', boxShadow: '8px 8px 0px var(--color-ink)' 
      }}>
        <h2 style={{ fontSize: '22px', color: 'var(--color-ink)', marginBottom: '8px' }}>Log in</h2>
        <p style={{ color: 'var(--color-fog)', fontSize: '15px', marginBottom: '32px' }}>Enter your credentials to access your courses.</p>

        {errors.length > 0 && (
          <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '12px', marginBottom: '24px', fontSize: '14px', fontWeight: 500, border: '1px solid #fca5a5' }}>
            <ul style={{ margin: 0, paddingLeft: errors.length > 1 ? '16px' : '0', listStyleType: errors.length > 1 ? 'disc' : 'none' }}>
              {errors.map((errMsg, i) => (
                <li key={i}>{errMsg}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label className="admin-label">Email Address</label>
            <input 
              type="email" 
              className="admin-input" 
              placeholder="student@college.edu"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="admin-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                className="admin-input" 
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-fog)', cursor: 'pointer', padding: '4px' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="admin-btn-primary"
            style={{ width: '100%', marginTop: '12px', padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '16px' }}
          >
            {loading ? 'Logging in...' : (
              <>
                <LogIn size={20} /> Access Portal
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '15px', color: 'var(--color-fog)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--color-ink)', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: '4px' }}>
            Register here
          </Link>
        </div>
      </div>
      
    </div>
  );
}

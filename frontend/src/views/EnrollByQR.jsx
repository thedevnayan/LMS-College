'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { enrollAPI, setToken } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import {
  GraduationCap, LogIn, UserPlus, Eye, EyeOff, Loader2,
  CheckCircle2, BookOpen, Calendar, Users, FlaskConical,
  ArrowRight, AlertCircle, ShieldCheck
} from 'lucide-react';

export default function EnrollByQR() {
  const { token } = useParams();
  const router = useRouter();
  const { setUser } = useAuth();

  // Token info state
  const [tokenInfo, setTokenInfo] = useState(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [tokenError, setTokenError] = useState('');

  // Auth form state
  const [isNewAccount, setIsNewAccount] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [errors, setErrors] = useState([]);

  // Lab selection state
  const [requiresLabSelection, setRequiresLabSelection] = useState(false);
  const [availableLabBatches, setAvailableLabBatches] = useState([]);
  const [selectedLabBatch, setSelectedLabBatch] = useState('');

  // Success state
  const [enrollResult, setEnrollResult] = useState(null);

  useEffect(() => {
    fetchTokenInfo();
  }, [token]);

  const fetchTokenInfo = async () => {
    try {
      setTokenLoading(true);
      const res = await enrollAPI.getTokenInfo(token);
      if (res.success) {
        setTokenInfo(res.data);
        if (res.data.requiresLabSelection && res.data.availableLabBatches?.length > 0) {
          setRequiresLabSelection(true);
          setAvailableLabBatches(res.data.availableLabBatches);
          setSelectedLabBatch(res.data.availableLabBatches[0]);
        }
      }
    } catch (err) {
      setTokenError(err.message || 'This enrollment link is invalid or has expired.');
    } finally {
      setTokenLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      return setErrors(['Email and password are required.']);
    }
    if (isNewAccount && !formData.name) {
      return setErrors(['Name is required for registration.']);
    }

    setEnrolling(true);
    setErrors([]);

    try {
      const payload = {
        email: formData.email,
        password: formData.password,
        isNewAccount,
        ...(isNewAccount ? { name: formData.name } : {}),
        ...(selectedLabBatch ? { labBatch: selectedLabBatch } : {}),
      };

      const res = await enrollAPI.enrollWithToken(token, payload);

      if (res.success) {
        if (res.data?.requiresLabSelection) {
          // Server says we need lab selection
          setRequiresLabSelection(true);
          setAvailableLabBatches(res.data.labBatches || []);
          if (res.data.labBatches?.length > 0) {
            setSelectedLabBatch(res.data.labBatches[0]);
          }
          // Store temporary auth data
          if (res.data.accessToken) {
            setToken(res.data.accessToken);
            setUser(res.data.user);
          }
        } else {
          // Enrollment successful
          if (res.data.accessToken) {
            setToken(res.data.accessToken);
            setUser(res.data.user);
          }
          setEnrollResult(res.data);
        }
      }
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length > 0) {
        setErrors(Object.values(err.fields));
      } else {
        setErrors([err.message || 'Something went wrong. Please try again.']);
      }
    } finally {
      setEnrolling(false);
    }
  };

  // ── Loading State ──
  if (tokenLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingCard}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite' }} color="var(--color-ink)" />
          <p style={{ marginTop: '16px', color: 'var(--color-fog)', fontSize: '16px' }}>Validating enrollment link...</p>
        </div>
        <style>{spinKeyframe}</style>
      </div>
    );
  }

  // ── Error State (invalid/expired token) ──
  if (tokenError) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.errorIcon}>
            <AlertCircle size={48} color="#dc2626" />
          </div>
          <h2 style={{ fontSize: '22px', color: 'var(--color-ink)', marginBottom: '8px', textAlign: 'center' }}>
            Invalid Enrollment Link
          </h2>
          <p style={{ color: 'var(--color-fog)', fontSize: '15px', textAlign: 'center', marginBottom: '24px' }}>
            {tokenError}
          </p>
          <p style={{ color: 'var(--color-fog)', fontSize: '14px', textAlign: 'center' }}>
            Please ask your professor to share a new QR code.
          </p>
        </div>
      </div>
    );
  }

  // ── Success State ──
  if (enrollResult) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            backgroundColor: 'rgba(193, 243, 43, 0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
            border: '2px solid var(--color-lime-burst)',
          }}>
            <CheckCircle2 size={36} color="var(--color-spring-green)" />
          </div>

          <h2 style={{ fontSize: '24px', color: 'var(--color-ink)', marginBottom: '8px', textAlign: 'center', fontWeight: 800 }}>
            You're In!
          </h2>

          <p style={{ color: 'var(--color-fog)', fontSize: '15px', textAlign: 'center', marginBottom: '24px' }}>
            {enrollResult.isBatch
              ? `Successfully enrolled in ${enrollResult.enrolledCount} classes for Batch ${enrollResult.batch}!`
              : `Successfully enrolled in ${enrollResult.classroom?.courseName}!`
            }
          </p>

          {enrollResult.isBatch && enrollResult.classrooms?.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              {enrollResult.classrooms.map((c, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 14px', backgroundColor: 'var(--color-warm-linen)',
                  borderRadius: '10px', marginBottom: '6px', fontSize: '14px',
                }}>
                  {c.type === 'lab' ? <FlaskConical size={16} color="var(--color-hot-pink)" /> : <BookOpen size={16} color="var(--color-ink)" />}
                  <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{c.courseName}</span>
                  {c.labBatch && (
                    <span style={{
                      fontSize: '11px', backgroundColor: 'rgba(255,77,213,0.12)',
                      color: '#ff4dd5', padding: '2px 8px', borderRadius: '4px', fontWeight: 600,
                    }}>
                      {c.labBatch}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => router.push('/dashboard')}
            style={{
              ...styles.primaryBtn,
              width: '100%', display: 'flex', justifyContent: 'center',
              alignItems: 'center', gap: '8px',
            }}
          >
            Go to Dashboard <ArrowRight size={18} />
          </button>
        </div>
        <style>{spinKeyframe}</style>
      </div>
    );
  }

  // ── Main Enrollment Form ──
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <div style={{
          backgroundColor: 'var(--color-ink)', padding: '12px', borderRadius: '16px',
          boxShadow: '4px 4px 0px var(--color-sun-yellow)',
        }}>
          <GraduationCap size={32} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: '28px', color: 'var(--color-ink)', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Class Enrollment
          </h1>
          <p style={{ color: 'var(--color-fog)', fontSize: '15px' }}>
            <ShieldCheck size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            Secure QR enrollment
          </p>
        </div>
      </div>

      {/* Enrollment Info Card */}
      {tokenInfo && (
        <div style={{
          backgroundColor: 'var(--color-paper-white)', width: '100%', maxWidth: '440px',
          padding: '20px 24px', borderRadius: '16px', border: '2px solid var(--color-ink)',
          marginBottom: '16px', boxShadow: '4px 4px 0px var(--color-lime-burst)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Calendar size={16} color="var(--color-fog)" />
            <span style={{ fontSize: '14px', color: 'var(--color-fog)' }}>Enrolling into:</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {tokenInfo.type === 'batch' ? (
              <>
                <span style={styles.infoPill}>
                  <Users size={14} /> Batch {tokenInfo.classBatch}
                </span>
                <span style={styles.infoPill}>
                  <Calendar size={14} /> {tokenInfo.session}
                </span>
                {tokenInfo.labBatch && (
                  <span style={{ ...styles.infoPill, backgroundColor: 'rgba(255,77,213,0.12)', color: '#ff4dd5' }}>
                    <FlaskConical size={14} /> Lab {tokenInfo.labBatch}
                  </span>
                )}
                <span style={{ ...styles.infoPill, backgroundColor: 'rgba(193,243,43,0.15)', color: 'var(--color-charcoal)' }}>
                  <BookOpen size={14} /> {tokenInfo.totalClasses} classes
                </span>
              </>
            ) : (
              <>
                <span style={styles.infoPill}>
                  <BookOpen size={14} /> {tokenInfo.courseName}
                </span>
                <span style={styles.infoPill}>
                  <Calendar size={14} /> {tokenInfo.session}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Auth Form Card */}
      <div style={styles.card}>
        {/* Toggle */}
        <div style={{
          display: 'flex', borderRadius: '12px', overflow: 'hidden',
          border: '2px solid var(--color-ink)', marginBottom: '28px',
        }}>
          <button
            type="button"
            onClick={() => { setIsNewAccount(false); setErrors([]); }}
            style={{
              flex: 1, padding: '12px', border: 'none', cursor: 'pointer', fontSize: '14px',
              fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              backgroundColor: !isNewAccount ? 'var(--color-ink)' : 'var(--color-paper-white)',
              color: !isNewAccount ? 'white' : 'var(--color-ink)',
              transition: 'all 0.2s ease',
            }}
          >
            <LogIn size={16} /> Log In
          </button>
          <button
            type="button"
            onClick={() => { setIsNewAccount(true); setErrors([]); }}
            style={{
              flex: 1, padding: '12px', border: 'none', cursor: 'pointer', fontSize: '14px',
              fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              backgroundColor: isNewAccount ? 'var(--color-ink)' : 'var(--color-paper-white)',
              color: isNewAccount ? 'white' : 'var(--color-ink)',
              transition: 'all 0.2s ease',
              borderLeft: '2px solid var(--color-ink)',
            }}
          >
            <UserPlus size={16} /> Register
          </button>
        </div>

        <h2 style={{ fontSize: '20px', color: 'var(--color-ink)', marginBottom: '6px', fontWeight: 700 }}>
          {isNewAccount ? 'Create your account' : 'Sign in to enroll'}
        </h2>
        <p style={{ color: 'var(--color-fog)', fontSize: '14px', marginBottom: '24px' }}>
          {isNewAccount
            ? 'Create a student account and get enrolled automatically.'
            : 'Enter your existing credentials to join.'}
        </p>

        {errors.length > 0 && (
          <div style={{
            padding: '12px 16px', backgroundColor: '#fee2e2', color: '#991b1b',
            borderRadius: '12px', marginBottom: '20px', fontSize: '14px', fontWeight: 500,
            border: '1px solid #fca5a5',
          }}>
            <ul style={{ margin: 0, paddingLeft: errors.length > 1 ? '16px' : '0', listStyleType: errors.length > 1 ? 'disc' : 'none' }}>
              {errors.map((errMsg, i) => (
                <li key={i}>{errMsg}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {isNewAccount && (
            <div>
              <label style={styles.label}>Full Name</label>
              <input
                type="text"
                className="admin-input"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          )}

          <div>
            <label style={styles.label}>Email Address</label>
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
            <label style={styles.label}>{isNewAccount ? 'Create Password' : 'Password'}</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="admin-input"
                placeholder={isNewAccount ? 'Min 8 characters, 1 letter, 1 number' : '••••••••'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--color-fog)', cursor: 'pointer', padding: '4px',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Lab batch selection (if needed) */}
          {requiresLabSelection && availableLabBatches.length > 0 && (
            <div>
              <label style={styles.label}>Select Your Lab Group</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {availableLabBatches.map((lb) => (
                  <button
                    key={lb}
                    type="button"
                    onClick={() => setSelectedLabBatch(lb)}
                    style={{
                      padding: '10px 20px', borderRadius: '10px', cursor: 'pointer',
                      fontSize: '14px', fontWeight: 700, transition: 'all 0.2s ease',
                      border: selectedLabBatch === lb ? '2px solid var(--color-ink)' : '2px solid var(--color-stone)',
                      backgroundColor: selectedLabBatch === lb ? 'var(--color-sun-yellow)' : 'var(--color-paper-white)',
                      color: 'var(--color-ink)',
                      boxShadow: selectedLabBatch === lb ? '3px 3px 0px var(--color-ink)' : 'none',
                    }}
                  >
                    <FlaskConical size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                    {lb}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={enrolling}
            style={{
              ...styles.primaryBtn,
              width: '100%', marginTop: '8px', display: 'flex', justifyContent: 'center',
              alignItems: 'center', gap: '8px', opacity: enrolling ? 0.7 : 1,
              cursor: enrolling ? 'not-allowed' : 'pointer',
            }}
          >
            {enrolling ? (
              <>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                {isNewAccount ? 'Registering & Enrolling...' : 'Signing in & Enrolling...'}
              </>
            ) : (
              <>
                {isNewAccount ? <UserPlus size={20} /> : <LogIn size={20} />}
                {isNewAccount ? 'Register & Enroll' : 'Sign In & Enroll'}
              </>
            )}
          </button>
        </form>
      </div>

      <style>{spinKeyframe}</style>
    </div>
  );
}

const spinKeyframe = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: 'var(--color-warm-linen)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  card: {
    backgroundColor: 'var(--color-paper-white)',
    width: '100%',
    maxWidth: '440px',
    padding: '36px',
    borderRadius: '24px',
    border: '2px solid var(--color-ink)',
    boxShadow: '8px 8px 0px var(--color-ink)',
  },
  loadingCard: {
    backgroundColor: 'var(--color-paper-white)',
    padding: '60px',
    borderRadius: '24px',
    border: '2px solid var(--color-ink)',
    boxShadow: '8px 8px 0px var(--color-ink)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  errorIcon: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    backgroundColor: '#fee2e2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--color-ink)',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  primaryBtn: {
    padding: '16px',
    borderRadius: 'var(--radius-buttons)',
    border: '2px solid var(--color-ink)',
    backgroundColor: 'var(--color-sun-yellow)',
    color: 'var(--color-ink)',
    fontSize: '16px',
    fontWeight: 800,
    boxShadow: '4px 4px 0px var(--color-ink)',
    transition: 'all 0.15s ease',
  },
  infoPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: 'var(--color-warm-linen)',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--color-charcoal)',
  },
};

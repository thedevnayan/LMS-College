'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { academicAPI, studentsAPI } from '@/services/api';
import { useAcademic } from '@/context/AcademicContext';
import {
  RefreshCw, CheckCircle2, ArrowRight, ShieldCheck,
  AlertTriangle, Calendar, Users, GraduationCap, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function SessionRollover() {
  const router = useRouter();
  const { activeSession, refreshSessions } = useAcademic();
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [batches, setBatches] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [newSessionName, setNewSessionName] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');

  // Selected student promotion
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [targetProgramId, setTargetProgramId] = useState('');
  const [targetPeriodId, setTargetPeriodId] = useState('');
  const [targetBatchId, setTargetBatchId] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, [activeSession]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [sessRes, stdRes, progRes, batchRes] = await Promise.all([
        academicAPI.getSessions(),
        studentsAPI.getAll(),
        academicAPI.getPrograms(),
        academicAPI.getBatches(),
      ]);

      if (sessRes.success) {
        setSessions(sessRes.data);
        if (activeSession) {
          setCurrentSessionId(activeSession._id);
        }
      }
      if (stdRes.success) setStudents(stdRes.data);
      if (progRes.success) setPrograms(progRes.data);
      if (batchRes.success) setBatches(batchRes.data);
    } catch (err) {
      console.error('Failed to load rollover data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProgramSelect = async (pId) => {
    setTargetProgramId(pId);
    if (pId) {
      const perRes = await academicAPI.getPeriods(`programId=${pId}`);
      if (perRes.success) setPeriods(perRes.data);
    } else {
      setPeriods([]);
    }
  };

  const handleExecuteRollover = async (e) => {
    e.preventDefault();
    if (!currentSessionId || !newSessionName || !newStartDate || !newEndDate) {
      toast.error('Please complete session details');
      return;
    }

    try {
      setSubmitting(true);

      const promotions = [];
      if (selectedStudentId && targetProgramId && targetPeriodId && targetBatchId) {
        promotions.push({
          studentId: selectedStudentId,
          programId: targetProgramId,
          cohortId: batches.find(b => b._id === targetBatchId)?.cohortId?._id || batches[0]?.cohortId?._id,
          newPeriodId: targetPeriodId,
          newTeachingGroupId: targetBatchId,
        });
      }

      const res = await academicAPI.rolloverSession({
        currentSessionId,
        newSessionName,
        newStartDate,
        newEndDate,
        promotions,
      });

      if (res.success) {
        toast.success(`Session ${newSessionName} activated! ${promotions.length} student(s) promoted.`);
        await refreshSessions();
        router.push('/admin/mis');
      }
    } catch (err) {
      toast.error(err.message || 'Rollover failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <RefreshCw size={24} color="var(--color-ink)" />
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.5px' }}>
            Academic Session Rollover & Promotion
          </h1>
        </div>
        <p style={{ color: 'var(--color-fog)', fontSize: '14px' }}>
          Transition the college to a new academic year, close active terms, and promote cohorts while preserving 100% of historical records.
        </p>
      </div>

      {/* Immutability Guarantee Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        padding: '16px 20px',
        borderRadius: '12px',
        border: '1px solid var(--color-ink)',
        backgroundColor: 'var(--color-electric-lime)',
        boxShadow: '3px 3px 0 var(--color-ink)',
        marginBottom: '32px',
      }}>
        <ShieldCheck size={24} color="var(--color-ink)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '2px' }}>
            Strict Historical Immutability Guarantee
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--color-ink)', lineHeight: '1.4' }}>
            When students are promoted to a new session or batch, past assignment submissions, test attempts, grades, and enrollments remain completely untouched. A new historical record is generated for the new session.
          </p>
        </div>
      </div>

      {/* Main Wizard Form */}
      <form onSubmit={handleExecuteRollover} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Step 1: Session Transition */}
        <div style={{
          backgroundColor: 'var(--color-paper-white)',
          border: '1px solid var(--color-ink)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '3px 3px 0 var(--color-ink)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-sun-yellow)',
              border: '1px solid var(--color-ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 700,
            }}>
              1
            </span>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-ink)' }}>
              Complete Current Session & Open New Session
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                Session to Complete
              </label>
              <select
                required
                value={currentSessionId}
                onChange={e => setCurrentSessionId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-ink)',
                  backgroundColor: 'var(--color-warm-linen)',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                <option value="">Select Session to Close</option>
                {sessions.map(s => (
                  <option key={s._id} value={s._id}>{s.name} ({s.status})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                New Academic Session Name
              </label>
              <input
                type="text"
                placeholder="e.g. 2027-28"
                required
                value={newSessionName}
                onChange={e => setNewSessionName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-ink)',
                  fontSize: '14px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                Start Date
              </label>
              <input
                type="date"
                required
                value={newStartDate}
                onChange={e => setNewStartDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-ink)',
                  fontSize: '14px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                End Date
              </label>
              <input
                type="date"
                required
                value={newEndDate}
                onChange={e => setNewEndDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-ink)',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>
        </div>

        {/* Step 2: Student Progression & Promotion */}
        <div style={{
          backgroundColor: 'var(--color-paper-white)',
          border: '1px solid var(--color-ink)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '3px 3px 0 var(--color-ink)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-periwinkle)',
              border: '1px solid var(--color-ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 700,
            }}>
              2
            </span>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-ink)' }}>
              Promote Student to New Academic Context
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                Select Student
              </label>
              <select
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-ink)',
                  fontSize: '14px',
                }}
              >
                <option value="">Select Student (Optional)</option>
                {students.map(s => (
                  <option key={s._id} value={s._id}>{s.name} ({s.email})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                Target Program
              </label>
              <select
                value={targetProgramId}
                onChange={e => handleProgramSelect(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-ink)',
                  fontSize: '14px',
                }}
              >
                <option value="">Select Program</option>
                {programs.map(p => (
                  <option key={p._id} value={p._id}>{p.name} ({p.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                Target Academic Period
              </label>
              <select
                value={targetPeriodId}
                onChange={e => setTargetPeriodId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-ink)',
                  fontSize: '14px',
                }}
              >
                <option value="">Select Period (e.g. Sem 3)</option>
                {periods.map(per => (
                  <option key={per._id} value={per._id}>{per.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                Target Teaching Group / Batch
              </label>
              <select
                value={targetBatchId}
                onChange={e => setTargetBatchId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-ink)',
                  fontSize: '14px',
                }}
              >
                <option value="">Select Batch (e.g. Batch B)</option>
                {batches.map(b => (
                  <option key={b._id} value={b._id}>{b.name} ({b.programId?.code})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Submit Execution Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            onClick={() => router.push('/admin/mis')}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1px solid var(--color-ink)',
              backgroundColor: 'transparent',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '12px 28px',
              borderRadius: '8px',
              border: '1px solid var(--color-ink)',
              backgroundColor: 'var(--color-sun-yellow)',
              color: 'var(--color-ink)',
              fontSize: '14px',
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '3px 3px 0 var(--color-ink)',
            }}
          >
            {submitting ? 'Executing Rollover...' : 'Execute Session Rollover'}
          </button>
        </div>
      </form>
    </div>
  );
}

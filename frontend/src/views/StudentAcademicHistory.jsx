'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { misAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import {
  GraduationCap, Calendar, BookOpen, Award, CheckCircle2,
  Clock, TrendingUp, AlertCircle, ChevronRight, FileText, Zap, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function StudentAcademicHistory({ studentId }) {
  const { user } = useAuth();
  const targetId = studentId || user?._id;

  const [profileData, setProfileData] = useState(null);
  const [selectedSessionIdx, setSelectedSessionIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (targetId) {
      fetchStudentHistory();
    }
  }, [targetId]);

  const fetchStudentHistory = async () => {
    try {
      setLoading(true);
      const res = await misAPI.getStudentHistory(targetId);
      if (res.success) {
        setProfileData(res.data);
      }
    } catch (err) {
      console.error('Failed to load student academic history:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-fog)' }}>
        Loading student academic history...
      </div>
    );
  }

  if (!profileData) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <h3>Academic profile not found</h3>
      </div>
    );
  }

  const { student, current, history = [], timeline = [], indicators = [] } = profileData;
  const activeSessionRecord = history[selectedSessionIdx] || history[0];

  return (
    <div style={{ padding: '32px', maxWidth: '1140px', margin: '0 auto' }}>
      {/* Top Header / Profile Info */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid var(--color-ink)',
        backgroundColor: 'var(--color-paper-white)',
        boxShadow: '3px 3px 0 var(--color-ink)',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-periwinkle)',
            border: '2px solid var(--color-ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            fontWeight: 700,
          }}>
            {student.name.charAt(0)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-ink)' }}>
                {student.name}
              </h1>
              <span style={{
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: 'var(--color-sun-yellow)',
                border: '1px solid var(--color-ink)',
                textTransform: 'uppercase',
              }}>
                Student
              </span>
            </div>
            <p style={{ color: 'var(--color-fog)', fontSize: '13px' }}>{student.email}</p>
          </div>
        </div>

        {/* Current Academic Context Card */}
        {current && (
          <div style={{
            padding: '12px 18px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-warm-linen)',
            border: '1px solid var(--color-ink)',
            fontSize: '13px',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-fog)' }}>
              Current Academic Context
            </div>
            <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '2px' }}>
              {current.programId?.name} ({current.programId?.code})
            </div>
            <div style={{ color: 'var(--color-ink)', fontSize: '13px' }}>
              {current.academicPeriodId?.name} • {current.teachingGroupId?.name} • Session {current.academicSessionId?.name}
            </div>
          </div>
        )}
      </div>

      {/* Factual Performance Indicators */}
      {indicators.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '24px' }}>
          {indicators.map((ind, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: ind.type === 'TOP_PERFORMER' ? 'var(--color-sun-yellow)' : 'var(--color-electric-lime)',
                border: '1px solid var(--color-ink)',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <TrendingUp size={16} />
              <span>{ind.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Session History Tabs */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
          Academic Trajectory & Historical Sessions
        </h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {history.map((h, idx) => {
            const isSelected = selectedSessionIdx === idx;
            return (
              <button
                key={h.session?._id || idx}
                onClick={() => setSelectedSessionIdx(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-ink)',
                  backgroundColor: isSelected ? 'var(--color-sun-yellow)' : 'var(--color-paper-white)',
                  boxShadow: isSelected ? '3px 3px 0 var(--color-ink)' : 'none',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <Calendar size={15} />
                <span>Session {h.session?.name}</span>
                <span style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: h.status === 'Active' ? 'var(--color-electric-lime)' : 'rgba(0,0,0,0.06)',
                  border: '1px solid var(--color-ink)',
                }}>
                  {h.period?.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Session Details Grid */}
      {activeSessionRecord && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '36px' }}>
          {/* Academic Context In Selected Session */}
          <div style={{
            backgroundColor: 'var(--color-paper-white)',
            border: '1px solid var(--color-ink)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '3px 3px 0 var(--color-ink)',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <GraduationCap size={18} />
              Session Context ({activeSessionRecord.session?.name})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div>Program: <strong>{activeSessionRecord.program?.name} ({activeSessionRecord.program?.code})</strong></div>
              <div>Cohort: <strong>{activeSessionRecord.cohort?.name || 'N/A'}</strong></div>
              <div>Academic Period: <strong>{activeSessionRecord.period?.name}</strong></div>
              <div>Batch: <strong>{activeSessionRecord.batch?.name}</strong></div>
              <div>Session Status: <strong>{activeSessionRecord.status}</strong></div>
              <div>Session Average: <strong>{activeSessionRecord.averageScore}%</strong></div>
            </div>
          </div>

          {/* Enrolled Courses & Faculty */}
          <div style={{
            backgroundColor: 'var(--color-paper-white)',
            border: '1px solid var(--color-ink)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '3px 3px 0 var(--color-ink)',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BookOpen size={18} />
              Courses & Faculty
            </h3>
            {activeSessionRecord.courses?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeSessionRecord.courses.map(c => (
                  <div
                    key={c._id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--color-warm-linen)',
                      border: '1px solid var(--color-ink)',
                      fontSize: '13px',
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{c.courseOfferingId?.courseId?.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-fog)', marginTop: '2px' }}>
                      Faculty: {c.courseOfferingId?.primaryTeacherId?.name || 'Assigned'} • {c.practicalGroupId ? c.practicalGroupId.name : 'Theory'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--color-fog)' }}>No courses recorded in this session.</div>
            )}
          </div>

          {/* Assignments & Assessments in this session */}
          <div style={{
            backgroundColor: 'var(--color-paper-white)',
            border: '1px solid var(--color-ink)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '3px 3px 0 var(--color-ink)',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={18} />
              Assessments & Scores
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
              {activeSessionRecord.submissions?.map(sub => (
                <div key={sub._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid rgba(0,0,0,0.06)', fontSize: '13px' }}>
                  <span>{sub.assignmentId?.title || 'Assignment'}</span>
                  <strong style={{ color: 'var(--color-ink)' }}>{sub.marks}/{sub.assignmentId?.maxMarks || 100}</strong>
                </div>
              ))}
              {activeSessionRecord.testAttempts?.map(ta => (
                <div key={ta._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid rgba(0,0,0,0.06)', fontSize: '13px' }}>
                  <span>{ta.testId?.title || 'Test'}</span>
                  <strong style={{ color: 'var(--color-ink)' }}>{ta.score} pts</strong>
                </div>
              ))}
              {(!activeSessionRecord.submissions?.length && !activeSessionRecord.testAttempts?.length) && (
                <div style={{ fontSize: '13px', color: 'var(--color-fog)' }}>No assessments recorded in this session.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unified Dynamic Academic Timeline */}
      <div style={{
        backgroundColor: 'var(--color-paper-white)',
        border: '1px solid var(--color-ink)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '3px 3px 0 var(--color-ink)',
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '4px' }}>
          Unified Academic Activity Timeline
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-fog)', marginBottom: '24px' }}>
          Chronological audit trail generated dynamically from actual enrollment, assignment, and test attempt records
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
          {timeline.map((ev, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                position: 'relative',
              }}
            >
              {/* Icon / Marker */}
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: ev.type === 'ENROLLMENT' ? 'var(--color-sun-yellow)' : ev.type === 'TEST_ATTEMPT' ? 'var(--color-hot-pink)' : 'var(--color-electric-lime)',
                border: '1px solid var(--color-ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {ev.type === 'ENROLLMENT' && <GraduationCap size={18} />}
                {ev.type === 'SUBMISSION' && <FileText size={18} />}
                {ev.type === 'TEST_ATTEMPT' && <Zap size={18} />}
              </div>

              {/* Event Content */}
              <div style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-warm-linen)',
                border: '1px solid var(--color-ink)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-ink)' }}>
                    {ev.title}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-fog)' }}>
                    {ev.sessionName} • {new Date(ev.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-fog)' }}>
                  {ev.subtitle}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

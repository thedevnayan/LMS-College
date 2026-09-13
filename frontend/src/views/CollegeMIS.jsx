'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAcademic } from '@/context/AcademicContext';
import { misAPI } from '@/services/api';
import {
  Users, BookOpen, GraduationCap, Award, CheckCircle2,
  TrendingUp, Download, Search, ChevronRight, BarChart3,
  Calendar, ArrowUpRight, Filter, AlertCircle
} from 'lucide-react';
import Link from 'next/link';

export default function CollegeMIS() {
  const { activeSession, sessions, switchSession } = useAcademic();
  const [overview, setOverview] = useState(null);
  const [comparison, setComparison] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (activeSession) {
      fetchMISData();
    }
  }, [activeSession]);

  const fetchMISData = async () => {
    try {
      setLoading(true);
      const [ovRes, compRes] = await Promise.all([
        misAPI.getOverview(activeSession?._id),
        misAPI.compareSessions(),
      ]);

      if (ovRes.success) setOverview(ovRes.data);
      if (compRes.success) setComparison(compRes.data);
    } catch (err) {
      console.error('Failed to load MIS data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      setSearching(true);
      const res = await misAPI.search(q);
      if (res.success) {
        setSearchResults(res.data);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const metrics = overview?.metrics || {};
  const gradeDist = overview?.gradeDistribution || {};

  const cards = [
    { label: 'Total Enrolled', value: metrics.totalStudents || 0, sub: `${metrics.activeStudents || 0} active`, icon: Users, color: 'var(--color-sun-yellow)' },
    { label: 'Faculty Members', value: metrics.totalTeachers || 0, sub: 'Assigned teachers', icon: GraduationCap, color: 'var(--color-periwinkle)' },
    { label: 'Active Programs', value: metrics.programsCount || 0, sub: `${metrics.departmentsCount || 0} departments`, icon: BookOpen, color: 'var(--color-electric-lime)' },
    { label: 'Course Offerings', value: metrics.activeCourses || 0, sub: `${metrics.activeBatches || 0} batches`, icon: BarChart3, color: 'var(--color-hot-pink)' },
    { label: 'Assignment Completion', value: `${metrics.assignmentCompletionRate || 0}%`, sub: `${metrics.submissionsCount || 0} submitted`, icon: CheckCircle2, color: 'var(--color-mint)' },
    { label: 'Average Score', value: `${metrics.averageScore || 0}%`, sub: 'Institutional avg', icon: Award, color: 'var(--color-sun-yellow)' },
  ];

  return (
    <div style={{ padding: '32px', maxWidth: '1240px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.5px' }}>
              Institutional MIS & Analytics
            </h1>
            <span style={{
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: 'var(--color-electric-lime)',
              border: '1px solid var(--color-ink)',
            }}>
              Session {activeSession?.name || 'All'}
            </span>
          </div>
          <p style={{ color: 'var(--color-fog)', fontSize: '14px' }}>
            Real-time academic performance, enrollment metrics, and cross-session historical reports
          </p>
        </div>

        {/* Global Search & Export Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search student, course, batch..."
              value={searchQuery}
              onChange={handleSearch}
              style={{
                padding: '10px 14px 10px 36px',
                borderRadius: '8px',
                border: '1px solid var(--color-ink)',
                backgroundColor: 'var(--color-paper-white)',
                fontSize: '14px',
                minWidth: '260px',
                outline: 'none',
              }}
            />
            <Search size={16} color="var(--color-fog)" style={{ position: 'absolute', left: '12px', top: '13px' }} />

            {/* Dropdown Results */}
            {searchResults && (
              <div style={{
                position: 'absolute',
                top: '46px',
                left: 0,
                right: 0,
                backgroundColor: 'var(--color-paper-white)',
                border: '1px solid var(--color-ink)',
                borderRadius: '8px',
                boxShadow: '4px 4px 0 var(--color-ink)',
                zIndex: 100,
                maxHeight: '320px',
                overflowY: 'auto',
                padding: '8px',
              }}>
                {searchResults.students?.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-fog)', textTransform: 'uppercase', padding: '4px 8px' }}>
                      Students
                    </div>
                    {searchResults.students.map(s => (
                      <Link
                        key={s._id}
                        href={`/admin/students/${s._id}`}
                        style={{
                          display: 'block',
                          padding: '8px',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          color: 'var(--color-ink)',
                          fontSize: '13px',
                          backgroundColor: 'var(--color-warm-linen)',
                          marginBottom: '4px',
                        }}
                      >
                        <strong>{s.name}</strong> • {s.email}
                      </Link>
                    ))}
                  </div>
                )}
                {searchResults.courses?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-fog)', textTransform: 'uppercase', padding: '4px 8px' }}>
                      Courses
                    </div>
                    {searchResults.courses.map(c => (
                      <div key={c._id} style={{ padding: '6px 8px', fontSize: '13px', color: 'var(--color-ink)' }}>
                        {c.title} ({c.code})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <a
            href={misAPI.getExportUrl('students', activeSession?._id)}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid var(--color-ink)',
              backgroundColor: 'var(--color-paper-white)',
              color: 'var(--color-ink)',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              cursor: 'pointer',
              boxShadow: '2px 2px 0 var(--color-ink)',
            }}
          >
            <Download size={15} />
            Export CSV
          </a>
        </div>
      </div>

      {/* Overview Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
      }}>
        {cards.map((card, idx) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.3 }}
            style={{
              backgroundColor: 'var(--color-paper-white)',
              border: '1px solid var(--color-ink)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '3px 3px 0 var(--color-ink)',
            }}
          >
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: card.color,
              border: '1px solid var(--color-ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
            }}>
              <card.icon size={20} color="var(--color-ink)" />
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.5px' }}>
              {card.value}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginTop: '2px' }}>
              {card.label}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-fog)', marginTop: '2px' }}>
              {card.sub}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Grade Distribution & Performance Analytics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '36px' }}>
        {/* Grade Distribution */}
        <div style={{
          backgroundColor: 'var(--color-paper-white)',
          border: '1px solid var(--color-ink)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '3px 3px 0 var(--color-ink)',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '8px' }}>
            Grade Distribution ({activeSession?.name || 'Current Session'})
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-fog)', marginBottom: '20px' }}>
            Aggregated distribution across graded assignments and assessments
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { grade: 'Grade A (80%+)', count: gradeDist.A || 0, color: 'var(--color-electric-lime)' },
              { grade: 'Grade B (65-79%)', count: gradeDist.B || 0, color: 'var(--color-sun-yellow)' },
              { grade: 'Grade C (50-64%)', count: gradeDist.C || 0, color: 'var(--color-periwinkle)' },
              { grade: 'Grade D (40-49%)', count: gradeDist.D || 0, color: 'var(--color-mint)' },
              { grade: 'Grade F (<40%)', count: gradeDist.F || 0, color: 'var(--color-hot-pink)' },
            ].map(item => {
              const total = (gradeDist.A || 0) + (gradeDist.B || 0) + (gradeDist.C || 0) + (gradeDist.D || 0) + (gradeDist.F || 0);
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
              return (
                <div key={item.grade}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                    <span>{item.grade}</span>
                    <span>{item.count} items ({pct}%)</span>
                  </div>
                  <div style={{
                    height: '10px',
                    width: '100%',
                    backgroundColor: 'var(--color-warm-linen)',
                    borderRadius: '5px',
                    overflow: 'hidden',
                    border: '1px solid var(--color-ink)',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      backgroundColor: item.color,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Academic Structure Shortcuts */}
        <div style={{
          backgroundColor: 'var(--color-paper-white)',
          border: '1px solid var(--color-ink)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '3px 3px 0 var(--color-ink)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '8px' }}>
              Academic Operations
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-fog)', marginBottom: '20px' }}>
              Direct access to configure institutions, cohorts, promotions, and session rollover
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link
                href="/admin/academic"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-ink)',
                  backgroundColor: 'var(--color-warm-linen)',
                  color: 'var(--color-ink)',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                <span>Academic Hierarchy (Programs, Batches, Offerings)</span>
                <ChevronRight size={16} />
              </Link>

              <Link
                href="/admin/rollover"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-ink)',
                  backgroundColor: 'var(--color-sun-yellow)',
                  color: 'var(--color-ink)',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                <span>Session Rollover & Student Promotion Wizard</span>
                <ChevronRight size={16} />
              </Link>

              <Link
                href="/admin/students"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-ink)',
                  backgroundColor: 'var(--color-warm-linen)',
                  color: 'var(--color-ink)',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                <span>Student Academic Rosters & Multi-Session Profiles</span>
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>

          <div style={{
            marginTop: '20px',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: 'rgba(0,0,0,0.03)',
            fontSize: '12px',
            color: 'var(--color-fog)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <AlertCircle size={15} />
            Historical records are immutable. Rollovers create new records per session.
          </div>
        </div>
      </div>

      {/* Multi-Session Comparison Table */}
      <div style={{
        backgroundColor: 'var(--color-paper-white)',
        border: '1px solid var(--color-ink)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '3px 3px 0 var(--color-ink)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-ink)' }}>
              Historical Session Comparison
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-fog)' }}>
              Multi-year trajectory calculated strictly from actual historical database records
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-ink)', backgroundColor: 'var(--color-warm-linen)' }}>
                <th style={{ padding: '12px 16px' }}>Academic Session</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Enrolled Students</th>
                <th style={{ padding: '12px 16px' }}>Courses</th>
                <th style={{ padding: '12px 16px' }}>Assignments</th>
                <th style={{ padding: '12px 16px' }}>Assessments</th>
                <th style={{ padding: '12px 16px' }}>Average Score</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row, idx) => (
                <tr
                  key={row.sessionId}
                  style={{
                    borderBottom: '1px solid var(--color-ink)',
                    backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)',
                  }}
                >
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                    {row.sessionName}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      border: '1px solid var(--color-ink)',
                      backgroundColor: row.status === 'Active' ? 'var(--color-electric-lime)' : 'var(--color-fog-light, #f0f0f0)',
                    }}>
                      {row.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{row.studentCount}</td>
                  <td style={{ padding: '12px 16px' }}>{row.courseCount}</td>
                  <td style={{ padding: '12px 16px' }}>{row.assignmentsCount}</td>
                  <td style={{ padding: '12px 16px' }}>{row.testsCount}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                    {row.averageScore}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

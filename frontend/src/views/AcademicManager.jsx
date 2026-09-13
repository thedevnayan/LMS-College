'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { academicAPI, coursesAPI } from '@/services/api';
import { useAcademic } from '@/context/AcademicContext';
import {
  Layers, Plus, BookOpen, Calendar, Users, GraduationCap,
  Check, ChevronRight, School, Tag, CheckCircle2, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function AcademicManager() {
  const { activeSession, refreshSessions } = useAcademic();
  const [activeTab, setActiveTab] = useState('programs'); // 'programs', 'batches', 'offerings', 'sessions'
  const [loading, setLoading] = useState(true);

  const [programs, setPrograms] = useState([]);
  const [batches, setBatches] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [courses, setCourses] = useState([]);

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'program', 'batch', 'offering', 'session'
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchData();
  }, [activeSession]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [progRes, batchRes, offRes, sessRes, courseRes] = await Promise.all([
        academicAPI.getPrograms(),
        academicAPI.getBatches(activeSession ? `academicSessionId=${activeSession._id}` : ''),
        academicAPI.getOfferings(activeSession ? `academicSessionId=${activeSession._id}` : ''),
        academicAPI.getSessions(),
        coursesAPI.list('limit=100'),
      ]);

      if (progRes.success) setPrograms(progRes.data);
      if (batchRes.success) setBatches(batchRes.data);
      if (offRes.success) setOfferings(offRes.data);
      if (sessRes.success) setSessions(sessRes.data);
      if (courseRes.success) setCourses(courseRes.data);
    } catch (err) {
      console.error('Failed to load academic data:', err);
      toast.error('Failed to load academic hierarchy');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = (type) => {
    setModalType(type);
    setFormData({});
    setShowModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalType === 'program') {
        const res = await academicAPI.createProgram({
          name: formData.name,
          code: formData.code,
          degreeType: formData.degreeType || 'Undergraduate',
          durationYears: Number(formData.durationYears || 3),
          totalPeriods: Number(formData.totalPeriods || 6),
        });
        if (res.success) {
          toast.success(`Program ${formData.name} and academic periods created`);
          setShowModal(false);
          fetchData();
        }
      } else if (modalType === 'batch') {
        // Find program & periods
        const selectedProg = programs.find(p => p._id === formData.programId);
        const periods = await academicAPI.getPeriods(`programId=${formData.programId}`);
        const cohorts = await academicAPI.getCohorts(`programId=${formData.programId}`);

        let cohortId = cohorts.data?.[0]?._id;
        if (!cohortId) {
          const newCohort = await academicAPI.createCohort({
            programId: formData.programId,
            name: `${selectedProg.code} Cohort`,
            startYear: 2026,
            endYear: 2029,
          });
          cohortId = newCohort.data._id;
        }

        const practicals = formData.practicalSubBatches ? formData.practicalSubBatches.split(',').map(s => s.trim()) : [];

        const res = await academicAPI.createBatch({
          programId: formData.programId,
          cohortId,
          academicSessionId: activeSession?._id,
          academicPeriodId: periods.data?.[0]?._id,
          name: formData.name,
          practicalSubBatches: practicals,
        });

        if (res.success) {
          toast.success(`Batch ${formData.name} created with ${practicals.length} practical groups`);
          setShowModal(false);
          fetchData();
        }
      } else if (modalType === 'session') {
        const res = await academicAPI.createSession({
          name: formData.name,
          startDate: formData.startDate,
          endDate: formData.endDate,
          status: formData.status || 'Upcoming',
        });
        if (res.success) {
          toast.success(`Session ${formData.name} created`);
          setShowModal(false);
          refreshSessions();
          fetchData();
        }
      }
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    }
  };

  const tabs = [
    { id: 'programs', label: 'Programs & Degrees', icon: GraduationCap, count: programs.length },
    { id: 'batches', label: 'Batches & Practical Groups', icon: Users, count: batches.length },
    { id: 'offerings', label: 'Course Offerings', icon: BookOpen, count: offerings.length },
    { id: 'sessions', label: 'Academic Sessions', icon: Calendar, count: sessions.length },
  ];

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.5px' }}>
            Academic Structure & Hierarchy
          </h1>
          <p style={{ color: 'var(--color-fog)', fontSize: '14px' }}>
            Configure programs, cohorts, academic periods, batches, and course offerings
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => openCreateModal('program')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid var(--color-ink)',
              backgroundColor: 'var(--color-sun-yellow)',
              color: 'var(--color-ink)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '2px 2px 0 var(--color-ink)',
            }}
          >
            <Plus size={16} />
            New Program
          </button>
          <button
            onClick={() => openCreateModal('batch')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid var(--color-ink)',
              backgroundColor: 'var(--color-paper-white)',
              color: 'var(--color-ink)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '2px 2px 0 var(--color-ink)',
            }}
          >
            <Plus size={16} />
            New Batch
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid var(--color-ink)',
        marginBottom: '24px',
      }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                borderRadius: '8px 8px 0 0',
                border: '1px solid var(--color-ink)',
                borderBottom: isActive ? '2px solid var(--color-paper-white)' : '1px solid var(--color-ink)',
                backgroundColor: isActive ? 'var(--color-paper-white)' : 'var(--color-warm-linen)',
                color: 'var(--color-ink)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                marginBottom: '-2px',
              }}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
              <span style={{
                padding: '2px 6px',
                borderRadius: '10px',
                fontSize: '11px',
                backgroundColor: isActive ? 'var(--color-sun-yellow)' : 'rgba(0,0,0,0.06)',
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'programs' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {programs.map(prog => (
            <div
              key={prog._id}
              style={{
                backgroundColor: 'var(--color-paper-white)',
                border: '1px solid var(--color-ink)',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '3px 3px 0 var(--color-ink)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: 'var(--color-periwinkle)',
                    border: '1px solid var(--color-ink)',
                  }}>
                    {prog.code}
                  </span>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-ink)', marginTop: '8px' }}>
                    {prog.name}
                  </h3>
                </div>
              </div>

              <div style={{ fontSize: '13px', color: 'var(--color-fog)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>Degree: <strong>{prog.degreeType}</strong></div>
                <div>Duration: <strong>{prog.durationYears} Years ({prog.totalPeriods} {prog.periodType}s)</strong></div>
                <div>Status: <span style={{ color: 'green', fontWeight: 600 }}>Active</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'batches' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {batches.map(batch => (
            <div
              key={batch._id}
              style={{
                backgroundColor: 'var(--color-paper-white)',
                border: '1px solid var(--color-ink)',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '3px 3px 0 var(--color-ink)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-ink)' }}>
                    {batch.name}
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--color-fog)', marginTop: '2px' }}>
                    {batch.programId?.name} • {batch.academicPeriodId?.name}
                  </div>
                </div>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: 'var(--color-electric-lime)',
                  border: '1px solid var(--color-ink)',
                }}>
                  {batch.studentCount || 0} Students
                </span>
              </div>

              {batch.practicalGroups?.length > 0 && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--color-ink)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-fog)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Practical Lab Sub-Batches
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {batch.practicalGroups.map(pg => (
                      <span
                        key={pg._id}
                        style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: 'var(--color-warm-linen)',
                          border: '1px solid var(--color-ink)',
                        }}
                      >
                        {pg.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'offerings' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {offerings.map(offering => (
            <div
              key={offering._id}
              style={{
                backgroundColor: 'var(--color-paper-white)',
                border: '1px solid var(--color-ink)',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '3px 3px 0 var(--color-ink)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: 'var(--color-sun-yellow)',
                  border: '1px solid var(--color-ink)',
                }}>
                  {offering.courseId?.code || 'CS'}
                </span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: 'var(--color-electric-lime)',
                  border: '1px solid var(--color-ink)',
                }}>
                  {offering.status}
                </span>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '4px' }}>
                {offering.courseId?.title}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--color-fog)', marginBottom: '12px' }}>
                {offering.programId?.name} • {offering.academicPeriodId?.name} • {offering.academicSessionId?.name}
              </p>

              <div style={{ fontSize: '13px', paddingTop: '10px', borderTop: '1px solid var(--color-ink)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Faculty: <strong>{offering.primaryTeacherId?.name || 'Assigned'}</strong></span>
                {offering.classroomId && (
                  <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>
                    Code: {offering.classroomId.joinCode}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'sessions' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {sessions.map(sess => (
            <div
              key={sess._id}
              style={{
                backgroundColor: 'var(--color-paper-white)',
                border: '1px solid var(--color-ink)',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '3px 3px 0 var(--color-ink)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-ink)' }}>
                  {sess.name}
                </h3>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: sess.status === 'Active' ? 'var(--color-electric-lime)' : 'var(--color-fog-light, #e0e0e0)',
                  border: '1px solid var(--color-ink)',
                }}>
                  {sess.status}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-fog)' }}>
                {new Date(sess.startDate).toLocaleDateString()} — {new Date(sess.endDate).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Creation Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'var(--color-paper-white)',
            border: '2px solid var(--color-ink)',
            borderRadius: '12px',
            padding: '28px',
            width: '100%',
            maxWidth: '460px',
            boxShadow: '6px 6px 0 var(--color-ink)',
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
              {modalType === 'program' && 'Add Degree Program'}
              {modalType === 'batch' && 'Add Teaching Batch'}
              {modalType === 'session' && 'Add Academic Session'}
            </h2>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {modalType === 'program' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Program Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Master of Computer Applications"
                      required
                      value={formData.name || ''}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-ink)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Program Code</label>
                    <input
                      type="text"
                      placeholder="e.g. MCA"
                      required
                      value={formData.code || ''}
                      onChange={e => setFormData({ ...formData, code: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-ink)' }}
                    />
                  </div>
                </>
              )}

              {modalType === 'batch' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Program</label>
                    <select
                      required
                      value={formData.programId || ''}
                      onChange={e => setFormData({ ...formData, programId: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-ink)' }}
                    >
                      <option value="">Select Program</option>
                      {programs.map(p => <option key={p._id} value={p._id}>{p.name} ({p.code})</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Batch Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Batch A"
                      required
                      value={formData.name || ''}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-ink)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Practical Sub-batches (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. Practical A1, Practical A2"
                      value={formData.practicalSubBatches || ''}
                      onChange={e => setFormData({ ...formData, practicalSubBatches: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-ink)' }}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--color-ink)', backgroundColor: 'transparent', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-ink)',
                    backgroundColor: 'var(--color-sun-yellow)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '2px 2px 0 var(--color-ink)',
                  }}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { academicAPI } from '@/services/api';
import { useAcademic } from '@/context/AcademicContext';
import {
  ArrowRight,
  CheckCircle2,
  Users,
  GraduationCap,
  Sparkles,
  BookOpen,
  Calendar,
  AlertCircle,
  RefreshCw,
  Plus,
  Layers,
  ChevronDown,
  Check,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function SessionRollover() {
  const router = useRouter();
  const { activeSession, refreshSessions } = useAcademic();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Core academic data
  const [sessions, setSessions] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [batches, setBatches] = useState([]);
  const [periods, setPeriods] = useState([]);

  // Source selection
  const [sourceBatchId, setSourceBatchId] = useState('');
  const [batchStudents, setBatchStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  // Target promotion details (auto-computed)
  const [targetSessionId, setTargetSessionId] = useState('');
  const [targetPeriodId, setTargetPeriodId] = useState('');
  const [targetBatchName, setTargetBatchName] = useState('');
  const [curriculumSubjects, setCurriculumSubjects] = useState([]);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);

  // Inline "New Session" modal
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [newSessionData, setNewSessionData] = useState({ name: '', startDate: '', endDate: '' });

  // Optional Year-End Session Rollover accordion
  const [showAdvancedRollover, setShowAdvancedRollover] = useState(false);
  const [rolloverForm, setRolloverForm] = useState({
    currentSessionId: '',
    newSessionName: '',
    newStartDate: '',
    newEndDate: '',
  });

  useEffect(() => {
    fetchInitialData();
  }, [activeSession]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [sessRes, progRes, batchRes] = await Promise.all([
        academicAPI.getSessions(),
        academicAPI.getPrograms(),
        academicAPI.getBatches(),
      ]);

      if (sessRes.success) {
        setSessions(sessRes.data || []);
        if (activeSession) {
          setTargetSessionId(activeSession._id);
          setRolloverForm(prev => ({ ...prev, currentSessionId: activeSession._id }));
        } else if (sessRes.data?.length > 0) {
          const curr = sessRes.data.find(s => s.isCurrent) || sessRes.data[0];
          setTargetSessionId(curr._id);
          setRolloverForm(prev => ({ ...prev, currentSessionId: curr._id }));
        }
      }

      if (progRes.success) setPrograms(progRes.data || []);
      if (batchRes.success) setBatches(batchRes.data || []);
    } catch (err) {
      console.error('Failed to load initial data:', err);
      toast.error('Failed to load batches or academic sessions');
    } finally {
      setLoading(false);
    }
  };

  // Selected source batch object
  const selectedBatch = useMemo(() => {
    return batches.find(b => b._id === sourceBatchId);
  }, [batches, sourceBatchId]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return batchStudents;
    const q = studentSearch.toLowerCase();
    return batchStudents.filter(item => {
      const s = item.student;
      if (!s) return false;
      return (
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.studentId && s.studentId.toLowerCase().includes(q))
      );
    });
  }, [batchStudents, studentSearch]);

  // When a batch is selected, load its students, load program periods, and auto-detect target semester
  const handleBatchSelect = async (bId) => {
    setSourceBatchId(bId);
    if (!bId) {
      setBatchStudents([]);
      setSelectedStudentIds([]);
      setTargetPeriodId('');
      setTargetBatchName('');
      setCurriculumSubjects([]);
      return;
    }

    const foundBatch = batches.find(b => b._id === bId);
    if (!foundBatch) return;

    const progId = foundBatch.programId?._id || foundBatch.programId;
    const currentPeriodId = foundBatch.academicPeriodId?._id || foundBatch.academicPeriodId;

    // Default target batch name to same name (e.g. "Batch B")
    setTargetBatchName(foundBatch.name || 'Batch B');

    // 1. Load students for this batch
    try {
      setLoadingStudents(true);
      const res = await academicAPI.getBatchStudents(bId);
      if (res.success) {
        setBatchStudents(res.data || []);
        setSelectedStudentIds((res.data || []).map(i => i.student?._id).filter(Boolean));
      }
    } catch (err) {
      console.error('Failed to load batch students:', err);
      toast.error('Failed to load students for batch');
    } finally {
      setLoadingStudents(false);
    }

    // 2. Load periods for this program & auto-select next semester
    if (progId) {
      try {
        const perRes = await academicAPI.getPeriods(`programId=${progId}`);
        if (perRes.success) {
          const sorted = (perRes.data || []).sort((a, b) => a.periodNumber - b.periodNumber);
          setPeriods(sorted);

          // Find current period number
          const currentPeriodObj = sorted.find(p => p._id === currentPeriodId);
          if (currentPeriodObj) {
            // Find periodNumber + 1
            const nextPeriodObj = sorted.find(p => p.periodNumber === currentPeriodObj.periodNumber + 1);
            if (nextPeriodObj) {
              setTargetPeriodId(nextPeriodObj._id);
              loadCurriculumPreview(progId, nextPeriodObj._id);
            } else {
              // Final period reached or not found
              setTargetPeriodId(currentPeriodId);
              loadCurriculumPreview(progId, currentPeriodId);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load periods:', err);
      }
    }
  };

  // When target semester is changed, fetch its curriculum subjects
  const handleTargetPeriodChange = (pId) => {
    setTargetPeriodId(pId);
    const progId = selectedBatch?.programId?._id || selectedBatch?.programId;
    if (progId && pId) {
      loadCurriculumPreview(progId, pId);
    }
  };

  const loadCurriculumPreview = async (progId, periodId) => {
    try {
      setLoadingCurriculum(true);
      const res = await academicAPI.getCurriculum(`programId=${progId}&academicPeriodId=${periodId}`);
      if (res.success) {
        setCurriculumSubjects(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load curriculum:', err);
    } finally {
      setLoadingCurriculum(false);
    }
  };

  // Student selection helpers
  const toggleStudent = (sId) => {
    setSelectedStudentIds(prev =>
      prev.includes(sId) ? prev.filter(id => id !== sId) : [...prev, sId]
    );
  };

  const selectAll = () => {
    setSelectedStudentIds(batchStudents.map(i => i.student?._id).filter(Boolean));
  };

  const deselectAll = () => {
    setSelectedStudentIds([]);
  };

  // Submit Simple Promotion
  const handlePromoteBatch = async (e) => {
    e.preventDefault();

    if (!sourceBatchId) {
      toast.error('Please select a batch to promote');
      return;
    }
    if (!targetPeriodId) {
      toast.error('Please select the target semester');
      return;
    }
    if (!targetSessionId) {
      toast.error('Please select the target academic session');
      return;
    }
    if (selectedStudentIds.length === 0) {
      toast.error('Please select at least one student to promote');
      return;
    }

    try {
      setSubmitting(true);
      const res = await academicAPI.promoteBatch({
        sourceBatchId,
        targetSessionId,
        targetProgramId: selectedBatch?.programId?._id || selectedBatch?.programId,
        targetCohortId: selectedBatch?.cohortId?._id || selectedBatch?.cohortId,
        targetPeriodId,
        targetBatchName: targetBatchName.trim() || 'Batch B',
        selectedStudentIds,
      });

      if (res.success) {
        const targetPeriodName = periods.find(p => p._id === targetPeriodId)?.name || 'Next Semester';
        toast.success(
          `Successfully promoted ${selectedStudentIds.length} student(s) to ${targetPeriodName}! Auto-enrolled into curriculum subjects.`
        );
        // Refresh batches list and reset selection
        const updatedBatches = await academicAPI.getBatches();
        if (updatedBatches.success) setBatches(updatedBatches.data || []);
        setSourceBatchId('');
        setBatchStudents([]);
        setSelectedStudentIds([]);
        setCurriculumSubjects([]);
      }
    } catch (err) {
      console.error('Promotion failed:', err);
      toast.error(err.message || 'Batch promotion failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Quick Create Session
  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!newSessionData.name.trim()) return;

    try {
      const res = await academicAPI.createSession({
        name: newSessionData.name.trim(),
        startDate: newSessionData.startDate || new Date().toISOString(),
        endDate: newSessionData.endDate || new Date(Date.now() + 365 * 86400000).toISOString(),
        status: 'Active',
      });

      if (res.success) {
        toast.success(`Academic Session ${newSessionData.name} created!`);
        setShowNewSessionModal(false);
        const updatedSessions = await academicAPI.getSessions();
        if (updatedSessions.success) {
          setSessions(updatedSessions.data || []);
          setTargetSessionId(res.data?._id || updatedSessions.data[0]._id);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create session');
    }
  };

  // Advanced Year-End Rollover handler
  const handleExecuteAdvancedRollover = async (e) => {
    e.preventDefault();
    if (!rolloverForm.currentSessionId || !rolloverForm.newSessionName) {
      toast.error('Please enter session name');
      return;
    }

    try {
      setSubmitting(true);
      const res = await academicAPI.rolloverSession({
        currentSessionId: rolloverForm.currentSessionId,
        newSessionName: rolloverForm.newSessionName,
        newStartDate: rolloverForm.newStartDate || new Date().toISOString(),
        newEndDate: rolloverForm.newEndDate || new Date(Date.now() + 365 * 86400000).toISOString(),
        batchPromotions: [],
      });

      if (res.success) {
        toast.success(`Academic Year ${rolloverForm.newSessionName} activated!`);
        await refreshSessions();
        fetchInitialData();
      }
    } catch (err) {
      toast.error(err.message || 'Session rollover failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--color-ink)' }} />
        <p style={{ color: 'var(--color-fog)', fontSize: '15px', fontWeight: 600 }}>Loading Batch Promotion...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* ─── PAGE TITLE ─── */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: 'var(--color-sun-yellow)',
            border: '1.5px solid var(--color-ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '2px 2px 0 var(--color-ink)',
          }}>
            <ArrowRight size={22} color="var(--color-ink)" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.5px' }}>
            Promote Batch to Next Semester
          </h1>
        </div>
        <p style={{ color: 'var(--color-fog)', fontSize: '14px', maxWidth: '700px' }}>
          Promote a batch to their next semester (e.g. <em>BCA Batch B Sem 3 → Sem 4</em>). Students will be automatically enrolled into the target semester's curriculum subjects.
        </p>
      </div>

      {/* ─── PROMOTION WORKFLOW FORM ─── */}
      <form onSubmit={handlePromoteBatch} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {/* STEP 1: CLASS SELECTION & AUTO-DETECTED PROGRESSION */}
        <div style={{
          backgroundColor: 'var(--color-paper-white)',
          border: '2px solid var(--color-ink)',
          borderRadius: '14px',
          padding: '26px',
          boxShadow: '4px 4px 0 var(--color-ink)',
        }}>
          {/* Main Batch Selector */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-fog)', marginBottom: '8px' }}>
              1. Select Batch to Promote
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={sourceBatchId}
                onChange={(e) => handleBatchSelect(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '2px solid var(--color-ink)',
                  backgroundColor: 'var(--color-paper-white)',
                  fontSize: '16px',
                  fontWeight: 800,
                  color: 'var(--color-ink)',
                  cursor: 'pointer',
                  appearance: 'none',
                }}
              >
                <option value="">-- Choose Teaching Batch (e.g. BCA Batch B Sem 3) --</option>
                {batches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.programId?.name || 'Program'} — {b.name} ({b.academicPeriodId?.name || 'Semester'}) • Session {b.academicSessionId?.name || ''} ({b.studentCount || 0} Students)
                  </option>
                ))}
              </select>
              <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <ChevronDown size={20} />
              </div>
            </div>
          </div>

          {/* GUIDANCE CARD WHEN NO BATCH IS SELECTED */}
          {!selectedBatch && (
            <div style={{
              backgroundColor: 'var(--color-warm-linen)',
              borderRadius: '12px',
              border: '1.5px dashed var(--color-ink)',
              padding: '36px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-sun-yellow)',
                border: '1.5px solid var(--color-ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '2px 2px 0 var(--color-ink)',
              }}>
                <GraduationCap size={24} color="var(--color-ink)" />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-ink)', margin: 0 }}>
                Select a Batch to Start Promotion
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-fog)', maxWidth: '520px', margin: 0, lineHeight: 1.5 }}>
                Choose a class batch above (e.g. <em>BCA Batch B Sem 3</em>). The system will automatically detect the next semester (<em>Sem 4</em>), auto-fetch fixed curriculum subjects, and load all students for review.
              </p>
              <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: '10px',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}>
                <span style={{ fontSize: '12px', fontWeight: 700, padding: '5px 12px', backgroundColor: 'var(--color-paper-white)', borderRadius: '6px', border: '1px solid var(--color-ink)' }}>
                  ① Choose Current Batch
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, padding: '5px 12px', backgroundColor: 'var(--color-paper-white)', borderRadius: '6px', border: '1px solid var(--color-ink)' }}>
                  ② Auto-Detect Next Sem & Subjects
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, padding: '5px 12px', backgroundColor: 'var(--color-paper-white)', borderRadius: '6px', border: '1px solid var(--color-ink)' }}>
                  ③ Uncheck Detained & Promote
                </span>
              </div>
            </div>
          )}

          {/* VISUAL TRANSITION: SOURCE CLASS -> TARGET CLASS */}
          {selectedBatch && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                gap: '20px',
                padding: '20px',
                backgroundColor: 'var(--color-warm-linen)',
                borderRadius: '12px',
                border: '1.5px solid var(--color-ink)',
              }}
            >
              {/* Left: Current Class */}
              <div style={{
                backgroundColor: 'var(--color-paper-white)',
                border: '1.5px solid var(--color-ink)',
                borderRadius: '10px',
                padding: '16px',
                boxShadow: '2px 2px 0 var(--color-ink)',
              }}>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 800,
                  backgroundColor: 'var(--color-sun-yellow)',
                  border: '1px solid var(--color-ink)',
                  marginBottom: '8px',
                }}>
                  CURRENT CLASS
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-ink)', marginBottom: '4px' }}>
                  {selectedBatch.programId?.code || 'PROGRAM'} — {selectedBatch.name}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-fog)', marginBottom: '10px' }}>
                  {selectedBatch.academicPeriodId?.name} • Session {selectedBatch.academicSessionId?.name}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--color-ink)' }}>
                  <Users size={15} />
                  <span>{batchStudents.length} Active Students</span>
                </div>
              </div>

              {/* Center: Progression Arrow */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '10px',
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-electric-lime)',
                  border: '1.5px solid var(--color-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '2px 2px 0 var(--color-ink)',
                }}>
                  <ArrowRight size={18} strokeWidth={3} />
                </div>
                <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Promote
                </span>
              </div>

              {/* Right: Next Class Target Options */}
              <div style={{
                backgroundColor: 'var(--color-paper-white)',
                border: '1.5px solid var(--color-ink)',
                borderRadius: '10px',
                padding: '16px',
                boxShadow: '2px 2px 0 var(--color-ink)',
              }}>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 800,
                  backgroundColor: 'var(--color-electric-lime)',
                  border: '1px solid var(--color-ink)',
                  marginBottom: '8px',
                }}>
                  PROMOTING TO
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Next Semester selector */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-fog)', marginBottom: '3px' }}>
                      Target Semester
                    </label>
                    <select
                      value={targetPeriodId}
                      onChange={(e) => handleTargetPeriodChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-ink)',
                        fontSize: '13px',
                        fontWeight: 700,
                        backgroundColor: 'var(--color-paper-white)',
                      }}
                    >
                      {periods.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} (Period {p.periodNumber})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Target Session selector with quick new session */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-fog)' }}>
                        Academic Session
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowNewSessionModal(true)}
                        style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-ink)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        + New Session
                      </button>
                    </div>
                    <select
                      value={targetSessionId}
                      onChange={(e) => setTargetSessionId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-ink)',
                        fontSize: '13px',
                        fontWeight: 700,
                        backgroundColor: 'var(--color-paper-white)',
                      }}
                    >
                      {sessions.map((s) => (
                        <option key={s._id} value={s._id}>
                          Session {s.name} ({s.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Target Batch Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-fog)', marginBottom: '3px' }}>
                      Batch Name in Target Semester
                    </label>
                    <input
                      type="text"
                      value={targetBatchName}
                      onChange={(e) => setTargetBatchName(e.target.value)}
                      placeholder="e.g. Batch B"
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-ink)',
                        fontSize: '13px',
                        fontWeight: 700,
                      }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* AUTO-ENROLLED CURRICULUM SUBJECTS PREVIEW */}
          {selectedBatch && targetPeriodId && (
            <div style={{
              marginTop: '20px',
              padding: '16px 20px',
              backgroundColor: '#f8fafc',
              borderRadius: '10px',
              border: '1.5px solid #cbd5e1',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color="#2563eb" />
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-ink)' }}>
                    Auto-Enrollment: Fixed Subjects for {periods.find(p => p._id === targetPeriodId)?.name || 'Next Semester'}
                  </span>
                </div>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  border: '1px solid #93c5fd',
                }}>
                  {curriculumSubjects.length} Curriculum Subjects Defined
                </span>
              </div>

              {loadingCurriculum ? (
                <p style={{ fontSize: '13px', color: 'var(--color-fog)' }}>Loading subjects from curriculum...</p>
              ) : curriculumSubjects.length > 0 ? (
                <div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {curriculumSubjects.map(sub => (
                      <span
                        key={sub._id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 10px',
                          backgroundColor: 'var(--color-paper-white)',
                          border: '1px solid var(--color-ink)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        <strong style={{ color: '#2563eb' }}>{sub.courseId?.code || 'SUBJ'}</strong>
                        {sub.courseId?.title}
                        <span style={{ fontSize: '11px', color: 'var(--color-fog)', fontWeight: 600 }}>({sub.credits} CR)</span>
                      </span>
                    ))}
                  </div>
                  <p style={{ fontSize: '12px', color: '#16a34a', fontWeight: 700 }}>
                    ✓ All {selectedStudentIds.length} promoted students will be automatically enrolled in these subjects!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--color-fog)', margin: 0 }}>
                    No fixed curriculum subjects defined yet for this semester.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push('/admin/curriculum')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: '1.5px solid var(--color-ink)',
                      backgroundColor: 'var(--color-sun-yellow)',
                      fontSize: '11px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '2px 2px 0 var(--color-ink)',
                    }}
                  >
                    Configure Curriculum Subjects ↗
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* STEP 2: STUDENTS REVIEW (CHECKBOXES) */}
        {selectedBatch && (
          <div style={{
            backgroundColor: 'var(--color-paper-white)',
            border: '2px solid var(--color-ink)',
            borderRadius: '14px',
            padding: '24px',
            boxShadow: '4px 4px 0 var(--color-ink)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-ink)' }}>
                  Students in {selectedBatch.name} ({selectedStudentIds.length} of {batchStudents.length} selected)
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--color-fog)' }}>
                  Uncheck any student who failed or is detained so they remain in their current semester.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Filter student..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-ink)',
                    fontSize: '12px',
                    width: '150px',
                    backgroundColor: 'var(--color-paper-white)',
                  }}
                />
                <button
                  type="button"
                  onClick={selectAll}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-ink)',
                    backgroundColor: 'var(--color-warm-linen)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={deselectAll}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-ink)',
                    backgroundColor: 'transparent',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Deselect All
                </button>
              </div>
            </div>

            {loadingStudents ? (
              <p style={{ color: 'var(--color-fog)', fontSize: '13px' }}>Loading students...</p>
            ) : batchStudents.length === 0 ? (
              <p style={{ color: 'var(--color-fog)', fontSize: '13px' }}>No active students found in this batch.</p>
            ) : filteredStudents.length === 0 ? (
              <p style={{ color: 'var(--color-fog)', fontSize: '13px' }}>No students matched &quot;{studentSearch}&quot;</p>
            ) : (
              <div style={{
                maxHeight: '260px',
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '8px',
                padding: '4px',
              }}>
                {filteredStudents.map((item) => {
                  const s = item.student;
                  if (!s) return null;
                  const isChecked = selectedStudentIds.includes(s._id);

                  return (
                    <div
                      key={s._id}
                      onClick={() => toggleStudent(s._id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: isChecked ? '1.5px solid var(--color-ink)' : '1px solid #e2e8f0',
                        backgroundColor: isChecked ? '#f0fdf4' : 'var(--color-paper-white)',
                        cursor: 'pointer',
                        transition: 'all 100ms ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by container click
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--color-ink)' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.name}
                        </strong>
                        <span style={{ fontSize: '11px', color: 'var(--color-fog)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {s.email}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PROMOTION EXECUTION BUTTON */}
        {selectedBatch && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={() => {
                setSourceBatchId('');
                setBatchStudents([]);
                setSelectedStudentIds([]);
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: '1.5px solid var(--color-ink)',
                backgroundColor: 'transparent',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || selectedStudentIds.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 32px',
                borderRadius: '10px',
                border: '2px solid var(--color-ink)',
                backgroundColor: 'var(--color-sun-yellow)',
                color: 'var(--color-ink)',
                fontWeight: 800,
                fontSize: '15px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '4px 4px 0 var(--color-ink)',
              }}
            >
              <ArrowRight size={18} strokeWidth={3} />
              {submitting
                ? 'Promoting & Auto-Enrolling...'
                : `Promote ${selectedBatch.name} to ${periods.find(p => p._id === targetPeriodId)?.name || 'Next Semester'} (${selectedStudentIds.length} Students)`}
            </button>
          </div>
        )}
      </form>

      {/* ─── OPTIONAL ADVANCED YEAR-END ROLLOVER ACCORDION ─── */}
      <div style={{ marginTop: '36px', borderTop: '1px solid #cbd5e1', paddingTop: '20px' }}>
        <button
          type="button"
          onClick={() => setShowAdvancedRollover(!showAdvancedRollover)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            color: 'var(--color-fog)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <ChevronDown size={16} style={{ transform: showAdvancedRollover ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease' }} />
          Need full Academic Year Rollover? (Close current session & activate new session)
        </button>

        <AnimatePresence>
          {showAdvancedRollover && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden', marginTop: '16px' }}
            >
              <form
                onSubmit={handleExecuteAdvancedRollover}
                style={{
                  padding: '20px',
                  backgroundColor: 'var(--color-paper-white)',
                  borderRadius: '12px',
                  border: '1.5px solid var(--color-ink)',
                  boxShadow: '3px 3px 0 var(--color-ink)',
                }}
              >
                <h4 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '12px' }}>
                  Close Session & Start New Academic Year
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Session to Complete</label>
                    <select
                      value={rolloverForm.currentSessionId}
                      onChange={(e) => setRolloverForm({ ...rolloverForm, currentSessionId: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--color-ink)', fontSize: '13px' }}
                    >
                      {sessions.map(s => <option key={s._id} value={s._id}>{s.name} ({s.status})</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>New Session Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. 2025-26"
                      required
                      value={rolloverForm.newSessionName}
                      onChange={(e) => setRolloverForm({ ...rolloverForm, newSessionName: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--color-ink)', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Start Date</label>
                    <input
                      type="date"
                      value={rolloverForm.newStartDate}
                      onChange={(e) => setRolloverForm({ ...rolloverForm, newStartDate: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--color-ink)', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>End Date</label>
                    <input
                      type="date"
                      value={rolloverForm.newEndDate}
                      onChange={(e) => setRolloverForm({ ...rolloverForm, newEndDate: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--color-ink)', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-ink)',
                    backgroundColor: 'var(--color-sun-yellow)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {submitting ? 'Rolling Over...' : 'Complete Current Session & Activate New Year'}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── MODAL: CREATE NEW ACADEMIC SESSION INLINE ─── */}
      <AnimatePresence>
        {showNewSessionModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 15, 18, 0.6)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px',
            }}
            onClick={() => setShowNewSessionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'var(--color-paper-white)',
                border: '2px solid var(--color-ink)',
                borderRadius: '14px',
                padding: '24px',
                width: '100%',
                maxWidth: '420px',
                boxShadow: '6px 6px 0 var(--color-ink)',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '14px' }}>
                Add Academic Session
              </h3>

              <form onSubmit={handleCreateSession} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Session Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2025-26"
                    required
                    value={newSessionData.name}
                    onChange={(e) => setNewSessionData({ ...newSessionData, name: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-ink)' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowNewSessionModal(false)}
                    style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--color-ink)', background: 'none', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1.5px solid var(--color-ink)',
                      backgroundColor: 'var(--color-sun-yellow)',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '2px 2px 0 var(--color-ink)',
                    }}
                  >
                    Create Session
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

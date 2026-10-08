'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { academicAPI, coursesAPI } from '@/services/api';
import { useAcademic } from '@/context/AcademicContext';
import { useAuth } from '@/context/AuthContext';
import {
  BookMarked,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Sparkles,
  RefreshCw,
  Search,
  UserCheck,
  Award,
  Layers,
  ChevronRight,
  BookOpen,
  Check,
  X,
  Clock,
  ArrowRight,
  Users,
  FlaskConical,
  BookCheck,
  Save,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

export default function CurriculumSetup() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { activeSession, sessions } = useAcademic();

  // Top-level tab: 'scheme' | 'allocation'
  const [activeViewTab, setActiveViewTab] = useState('scheme');

  // Data states
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [curriculumItems, setCurriculumItems] = useState([]);
  const [coursesCatalog, setCoursesCatalog] = useState([]);
  const [facultyList, setFacultyList] = useState([]);

  // Batches & Allocations data
  const [semesterBatches, setSemesterBatches] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [allocationForm, setAllocationForm] = useState({}); // Key: `${courseId}_${batchId}_${type}_${practicalGroupId || 'none'}` -> facultyId
  const [savingAllocations, setSavingAllocations] = useState(false);

  // UI / Modal states
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalMode, setModalMode] = useState('catalog'); // 'catalog' | 'new'
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [syncingSession, setSyncingSession] = useState(false);

  // Form states for Add/Edit Subject
  const [formData, setFormData] = useState({
    courseId: '',
    title: '',
    code: '',
    credits: 4,
    classification: 'both',
    isElective: false,
  });

  // Initial Load
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    loadInitialData();
  }, [isAuthenticated, authLoading]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [progsRes, coursesRes, facultyRes] = await Promise.all([
        academicAPI.getPrograms(),
        coursesAPI.list('limit=150'),
        academicAPI.getFaculty(),
      ]);

      if (progsRes.success) {
        setPrograms(progsRes.data || []);
        if (progsRes.data?.length > 0 && !selectedProgramId) {
          setSelectedProgramId(progsRes.data[0]._id);
        }
      }

      if (coursesRes.success) {
        setCoursesCatalog(coursesRes.data || []);
      }

      if (facultyRes.success) {
        setFacultyList(facultyRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load initial curriculum data:', err);
      toast.error('Failed to load programs or course catalog');
    } finally {
      setLoading(false);
    }
  };

  // When Program changes, load periods & curriculum
  useEffect(() => {
    if (!selectedProgramId) return;
    loadProgramCurriculum(selectedProgramId);
  }, [selectedProgramId]);

  const loadProgramCurriculum = async (programId) => {
    try {
      const [periodsRes, currRes] = await Promise.all([
        academicAPI.getPeriods(`programId=${programId}`),
        academicAPI.getCurriculum(`programId=${programId}`),
      ]);

      if (periodsRes.success) {
        const sortedPeriods = (periodsRes.data || []).sort((a, b) => a.periodNumber - b.periodNumber);
        setPeriods(sortedPeriods);
        if (sortedPeriods.length > 0) {
          setSelectedPeriodId((prev) => {
            const exists = sortedPeriods.some((p) => p._id === prev);
            return exists ? prev : sortedPeriods[0]._id;
          });
        } else {
          setSelectedPeriodId('');
        }
      }

      if (currRes.success) {
        setCurriculumItems(currRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load program curriculum:', err);
      toast.error('Failed to load curriculum subjects');
    }
  };

  // Load batches and allocations for the selected semester + active session
  useEffect(() => {
    if (!selectedProgramId || !selectedPeriodId || !activeSession) return;
    loadSemesterBatchesAndAllocations();
  }, [selectedProgramId, selectedPeriodId, activeSession]);

  const loadSemesterBatchesAndAllocations = async () => {
    try {
      const [batchesRes, allocRes] = await Promise.all([
        academicAPI.getBatches(`programId=${selectedProgramId}&academicPeriodId=${selectedPeriodId}&academicSessionId=${activeSession._id}`),
        academicAPI.getFacultyAllocations(`programId=${selectedProgramId}&academicPeriodId=${selectedPeriodId}&academicSessionId=${activeSession._id}`),
      ]);

      if (batchesRes.success) {
        setSemesterBatches(batchesRes.data || []);
      }

      if (allocRes.success) {
        const allocs = allocRes.data || [];
        setAllocations(allocs);

        // Populate local form mapping
        const formMap = {};
        for (const a of allocs) {
          const cId = a.courseId?._id || a.courseId;
          const tgId = a.teachingGroupId?._id || a.teachingGroupId;
          const pgId = a.practicalGroupId?._id || a.practicalGroupId || 'none';
          const key = `${cId}_${tgId}_${a.type}_${pgId}`;
          formMap[key] = a.facultyId?._id || a.facultyId;
        }
        setAllocationForm(formMap);
      }
    } catch (err) {
      console.error('Failed to load batches or allocations:', err);
    }
  };

  // Selected Program object
  const selectedProgram = useMemo(() => {
    return programs.find((p) => p._id === selectedProgramId);
  }, [programs, selectedProgramId]);

  // Selected Period object
  const selectedPeriod = useMemo(() => {
    return periods.find((p) => p._id === selectedPeriodId);
  }, [periods, selectedPeriodId]);

  // Group curriculum items by periodId
  const itemsByPeriod = useMemo(() => {
    const map = {};
    for (const item of curriculumItems) {
      const pId = item.academicPeriodId?._id || item.academicPeriodId;
      if (!map[pId]) map[pId] = [];
      map[pId].push(item);
    }
    return map;
  }, [curriculumItems]);

  // Subjects for the active selected period
  const activePeriodSubjects = useMemo(() => {
    if (!selectedPeriodId) return [];
    const list = itemsByPeriod[selectedPeriodId] || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (item) =>
        item.courseId?.title?.toLowerCase().includes(q) ||
        item.courseId?.code?.toLowerCase().includes(q)
    );
  }, [itemsByPeriod, selectedPeriodId, searchQuery]);

  // Overall program curriculum stats
  const totalCurriculumSubjects = curriculumItems.length;
  const totalCurriculumCredits = curriculumItems.reduce((acc, curr) => acc + (curr.credits || 0), 0);

  // Available courses in catalog not yet added to active semester
  const availableCatalogCourses = useMemo(() => {
    const existingCourseIds = new Set(
      (itemsByPeriod[selectedPeriodId] || []).map((i) => i.courseId?._id || i.courseId)
    );
    return coursesCatalog.filter((c) => !existingCourseIds.has(c._id));
  }, [coursesCatalog, itemsByPeriod, selectedPeriodId]);

  // Open modal to add subject
  const handleOpenAdd = () => {
    setEditingItem(null);
    setModalMode('catalog');
    setFormData({
      courseId: availableCatalogCourses[0]?._id || '',
      title: '',
      code: '',
      credits: 4,
      classification: 'both',
      isElective: false,
    });
    setShowAddModal(true);
  };

  // Open modal to edit subject
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setModalMode('edit');
    setFormData({
      courseId: item.courseId?._id || '',
      title: item.courseId?.title || '',
      code: item.courseId?.code || '',
      credits: item.credits || 4,
      classification: item.classification || 'both',
      isElective: item.isElective || false,
    });
    setShowAddModal(true);
  };

  // Submit Add / Edit Subject
  const handleSubmitSubject = async (e) => {
    e.preventDefault();
    if (!selectedProgramId || !selectedPeriodId) {
      toast.error('Please select a program and semester first');
      return;
    }

    try {
      setSaving(true);
      if (editingItem) {
        const res = await academicAPI.updateCurriculumSubject(editingItem._id, {
          credits: Number(formData.credits),
          classification: formData.classification,
          isElective: formData.isElective,
        });

        if (res.success) {
          toast.success('Subject updated in curriculum');
          setShowAddModal(false);
          await loadProgramCurriculum(selectedProgramId);
        }
      } else {
        let payload = {
          programId: selectedProgramId,
          academicPeriodId: selectedPeriodId,
          credits: Number(formData.credits),
          classification: formData.classification,
          isElective: formData.isElective,
        };

        if (modalMode === 'catalog') {
          if (!formData.courseId) {
            toast.error('Please select a course from the catalog');
            return;
          }
          payload.courseId = formData.courseId;
        } else {
          if (!formData.title.trim()) {
            toast.error('Subject title is required');
            return;
          }
          payload.newCourse = {
            title: formData.title.trim(),
            code: formData.code.trim().toUpperCase(),
            credits: Number(formData.credits),
            classification: formData.classification,
          };
        }

        const res = await academicAPI.addCurriculumSubject(payload);
        if (res.success) {
          toast.success('Subject added to semester curriculum');
          setShowAddModal(false);
          await loadProgramCurriculum(selectedProgramId);
          if (modalMode === 'new') {
            const updatedCourses = await coursesAPI.list('limit=150');
            if (updatedCourses.success) setCoursesCatalog(updatedCourses.data || []);
          }
        }
      }
    } catch (err) {
      console.error('Failed to save curriculum subject:', err);
      toast.error(err.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  // Delete Subject from Curriculum
  const handleDeleteSubject = async (item) => {
    const title = item.courseId?.title || 'this subject';
    if (!confirm(`Are you sure you want to remove "${title}" from ${selectedPeriod?.name}?`)) return;

    try {
      const res = await academicAPI.deleteCurriculumSubject(item._id);
      if (res.success) {
        toast.success(`Removed "${title}" from semester curriculum`);
        await loadProgramCurriculum(selectedProgramId);
      }
    } catch (err) {
      console.error('Failed to delete subject:', err);
      toast.error(err.message || 'Failed to remove subject');
    }
  };

  // Sync Curriculum to Academic Session Offerings
  const handleSyncToSession = async () => {
    if (!activeSession) {
      toast.error('No active academic session found to sync with');
      return;
    }
    if (!selectedProgramId) {
      toast.error('Please select a program first');
      return;
    }

    try {
      setSyncingSession(true);
      const res = await academicAPI.syncCurriculumOfferings({
        programId: selectedProgramId,
        academicSessionId: activeSession._id,
      });

      if (res.success) {
        toast.success(`Synced curriculum offerings for ${activeSession.name}`);
      }
    } catch (err) {
      console.error('Failed to sync offerings:', err);
      toast.error(err.message || 'Sync failed');
    } finally {
      setSyncingSession(false);
    }
  };

  // Update allocation form selection
  const handleAllocationChange = (courseId, batchId, type, practicalGroupId, facultyId) => {
    const pgKey = practicalGroupId || 'none';
    const key = `${courseId}_${batchId}_${type}_${pgKey}`;
    setAllocationForm((prev) => ({
      ...prev,
      [key]: facultyId,
    }));
  };

  // Save All Faculty Allocations
  const handleSaveAllAllocations = async () => {
    if (!activeSession) {
      toast.error('No active academic session selected');
      return;
    }

    // Build allocations array from allocationForm
    const allocationsToSave = [];

    for (const item of activePeriodSubjects) {
      const courseId = item.courseId?._id || item.courseId;
      const classification = item.classification || 'both';

      for (const batch of semesterBatches) {
        // Theory allocation
        if (classification === 'theory' || classification === 'both') {
          const key = `${courseId}_${batch._id}_theory_none`;
          const facultyId = allocationForm[key];
          if (facultyId) {
            allocationsToSave.push({
              courseId,
              teachingGroupId: batch._id,
              type: 'theory',
              practicalGroupId: null,
              facultyId,
            });
          }
        }

        // Lab allocation for each practical sub-batch
        if (classification === 'practical' || classification === 'both') {
          const practicals = batch.practicalGroups || [];
          if (practicals.length > 0) {
            for (const pg of practicals) {
              const key = `${courseId}_${batch._id}_lab_${pg._id}`;
              const facultyId = allocationForm[key];
              if (facultyId) {
                allocationsToSave.push({
                  courseId,
                  teachingGroupId: batch._id,
                  type: 'lab',
                  practicalGroupId: pg._id,
                  facultyId,
                });
              }
            }
          } else {
            // General lab batch if no practical sub-groups defined yet
            const key = `${courseId}_${batch._id}_lab_none`;
            const facultyId = allocationForm[key];
            if (facultyId) {
              allocationsToSave.push({
                courseId,
                teachingGroupId: batch._id,
                type: 'lab',
                practicalGroupId: null,
                facultyId,
              });
            }
          }
        }
      }
    }

    if (allocationsToSave.length === 0) {
      toast.error('Please assign at least one faculty member before saving');
      return;
    }

    try {
      setSavingAllocations(true);
      const res = await academicAPI.saveFacultyAllocations({
        academicSessionId: activeSession._id,
        programId: selectedProgramId,
        academicPeriodId: selectedPeriodId,
        allocations: allocationsToSave,
      });

      if (res.success) {
        toast.success(res.message || 'Faculty allocations saved and classrooms updated!');
        await loadSemesterBatchesAndAllocations();
      }
    } catch (err) {
      console.error('Failed to save allocations:', err);
      toast.error(err.message || 'Failed to save faculty allocations');
    } finally {
      setSavingAllocations(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--color-ink)' }} />
        <p style={{ color: 'var(--color-fog)', fontSize: '15px', fontWeight: 600 }}>Loading Semester Curriculum Architect...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1240px', margin: '0 auto' }}>
      {/* ─── PAGE HEADER ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: 'var(--color-sun-yellow)',
              border: '1.5px solid var(--color-ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '2px 2px 0 var(--color-ink)'
            }}>
              <BookMarked size={20} color="var(--color-ink)" />
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.5px' }}>
              Semester Curriculum Architect
            </h1>
          </div>
          <p style={{ color: 'var(--color-fog)', fontSize: '14px', maxWidth: '720px' }}>
            Define the fixed subjects for each semester, then allocate faculty to batches (e.g. Mamta for Batch B COA Theory, Mahima for B1 Lab, Mamta for B2 Lab).
          </p>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {activeSession && activeViewTab === 'scheme' && (
            <button
              onClick={handleSyncToSession}
              disabled={syncingSession}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1.5px solid var(--color-ink)',
                backgroundColor: 'var(--color-paper-white)',
                color: 'var(--color-ink)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: syncingSession ? 'not-allowed' : 'pointer',
                boxShadow: '3px 3px 0 var(--color-ink)',
              }}
            >
              <RefreshCw size={15} className={syncingSession ? 'animate-spin' : ''} />
              {syncingSession ? 'Syncing...' : `Sync Offerings (${activeSession.name})`}
            </button>
          )}

          {activeViewTab === 'scheme' ? (
            <button
              onClick={handleOpenAdd}
              disabled={!selectedPeriodId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1.5px solid var(--color-ink)',
                backgroundColor: 'var(--color-sun-yellow)',
                color: 'var(--color-ink)',
                fontWeight: 800,
                fontSize: '13px',
                cursor: !selectedPeriodId ? 'not-allowed' : 'pointer',
                boxShadow: '3px 3px 0 var(--color-ink)',
                opacity: !selectedPeriodId ? 0.6 : 1,
              }}
            >
              <Plus size={16} strokeWidth={3} />
              Add Subject to {selectedPeriod?.name || 'Semester'}
            </button>
          ) : (
            <button
              onClick={handleSaveAllAllocations}
              disabled={savingAllocations || semesterBatches.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                borderRadius: '8px',
                border: '1.5px solid var(--color-ink)',
                backgroundColor: 'var(--color-electric-lime)',
                color: 'var(--color-ink)',
                fontWeight: 800,
                fontSize: '13px',
                cursor: savingAllocations ? 'not-allowed' : 'pointer',
                boxShadow: '3px 3px 0 var(--color-ink)',
              }}
            >
              <Save size={16} strokeWidth={2.5} />
              {savingAllocations ? 'Saving Allocations...' : 'Save Faculty Allocations'}
            </button>
          )}
        </div>
      </div>

      {/* ─── PROGRAM SELECTOR & QUICK STATS ─── */}
      <div style={{
        backgroundColor: 'var(--color-paper-white)',
        border: '1.5px solid var(--color-ink)',
        borderRadius: '14px',
        padding: '20px 24px',
        marginBottom: '20px',
        boxShadow: '4px 4px 0 var(--color-ink)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
      }}>
        {/* Program dropdown */}
        <div style={{ flex: '1 1 300px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-fog)', marginBottom: '6px' }}>
            Select Degree Program
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1.5px solid var(--color-ink)',
                backgroundColor: 'var(--color-paper-white)',
                fontWeight: 700,
                fontSize: '15px',
                color: 'var(--color-ink)',
                cursor: 'pointer',
                appearance: 'none',
              }}
            >
              {programs.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.code}) — {p.totalPeriods} Semesters
                </option>
              ))}
            </select>
            <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <ChevronRight size={18} style={{ transform: 'rotate(90deg)' }} />
            </div>
          </div>
        </div>

        {/* Quick stats */}
        {selectedProgram && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid var(--color-ink)',
              backgroundColor: 'var(--color-warm-linen)',
              textAlign: 'center',
              minWidth: '100px',
            }}>
              <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-fog)' }}>DEGREE</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-ink)' }}>{selectedProgram.degreeType}</span>
            </div>

            <div style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid var(--color-ink)',
              backgroundColor: 'var(--color-warm-linen)',
              textAlign: 'center',
              minWidth: '100px',
            }}>
              <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-fog)' }}>PERIODS</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-ink)' }}>{periods.length} Semesters</span>
            </div>

            <div style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid var(--color-ink)',
              backgroundColor: 'var(--color-sun-yellow)',
              textAlign: 'center',
              minWidth: '110px',
              boxShadow: '2px 2px 0 var(--color-ink)',
            }}>
              <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-ink)' }}>CURRICULUM</span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-ink)' }}>{totalCurriculumSubjects} Subjects</span>
            </div>

            <div style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid var(--color-ink)',
              backgroundColor: 'var(--color-electric-lime)',
              textAlign: 'center',
              minWidth: '110px',
              boxShadow: '2px 2px 0 var(--color-ink)',
            }}>
              <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-ink)' }}>TOTAL CREDITS</span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-ink)' }}>{totalCurriculumCredits} Credits</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── DUAL WORKFLOW TABS: SCHEME vs FACULTY ALLOCATION ─── */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveViewTab('scheme')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '10px',
            border: '2px solid var(--color-ink)',
            backgroundColor: activeViewTab === 'scheme' ? 'var(--color-ink)' : 'var(--color-paper-white)',
            color: activeViewTab === 'scheme' ? 'var(--color-paper-white)' : 'var(--color-ink)',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: activeViewTab === 'scheme' ? '4px 4px 0 var(--color-sun-yellow)' : 'none',
          }}
        >
          <BookCheck size={18} />
          1. Semester Scheme & Subjects
        </button>

        <button
          onClick={() => setActiveViewTab('allocation')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '10px',
            border: '2px solid var(--color-ink)',
            backgroundColor: activeViewTab === 'allocation' ? 'var(--color-ink)' : 'var(--color-paper-white)',
            color: activeViewTab === 'allocation' ? 'var(--color-paper-white)' : 'var(--color-ink)',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: activeViewTab === 'allocation' ? '4px 4px 0 var(--color-electric-lime)' : 'none',
          }}
        >
          <Users size={18} />
          2. Batch & Lab Faculty Allocation
          {activeSession && (
            <span style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '6px',
              backgroundColor: activeViewTab === 'allocation' ? 'var(--color-electric-lime)' : 'var(--color-warm-linen)',
              color: 'var(--color-ink)',
              fontWeight: 800,
            }}>
              Session {activeSession.name}
            </span>
          )}
        </button>
      </div>

      {/* ─── SEMESTER PILLS NAVIGATION ─── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
          {periods.map((period) => {
            const isSelected = selectedPeriodId === period._id;
            const periodItems = itemsByPeriod[period._id] || [];
            const periodCredits = periodItems.reduce((acc, c) => acc + (c.credits || 0), 0);

            return (
              <button
                key={period._id}
                onClick={() => {
                  setSelectedPeriodId(period._id);
                  setSearchQuery('');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--color-ink)',
                  backgroundColor: isSelected ? 'var(--color-sun-yellow)' : 'var(--color-paper-white)',
                  color: 'var(--color-ink)',
                  cursor: 'pointer',
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  boxShadow: isSelected ? '3px 3px 0 var(--color-ink)' : 'none',
                  flexShrink: 0,
                }}
              >
                <span>{period.name}</span>
                <span
                  style={{
                    padding: '2px 7px',
                    borderRadius: '5px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: isSelected ? 'var(--color-ink)' : 'var(--color-warm-linen)',
                    color: isSelected ? 'var(--color-paper-white)' : 'var(--color-ink)',
                    border: '1px solid var(--color-ink)',
                  }}
                >
                  {periodItems.length} Sub • {periodCredits} CR
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ─── TAB 1: CURRICULUM SCHEME (SUBJECTS & CREDITS) ─────────── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeViewTab === 'scheme' && (
        <div style={{
          backgroundColor: 'var(--color-paper-white)',
          border: '1.5px solid var(--color-ink)',
          borderRadius: '14px',
          padding: '24px',
          boxShadow: '4px 4px 0 var(--color-ink)',
        }}>
          {/* Toolbar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--color-ink)',
          }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-ink)', marginBottom: '2px' }}>
                {selectedPeriod ? `${selectedPeriod.name} Scheme of Studies` : 'Select a Semester'}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--color-fog)' }}>
                {activePeriodSubjects.length} subject{activePeriodSubjects.length === 1 ? '' : 's'} assigned to this semester
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '260px' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-fog)' }} />
                <input
                  type="text"
                  placeholder="Search subject title or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-ink)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <button
                onClick={handleOpenAdd}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-ink)',
                  backgroundColor: 'var(--color-sun-yellow)',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: '2px 2px 0 var(--color-ink)',
                }}
              >
                <Plus size={14} strokeWidth={3} />
                Add Subject
              </button>
            </div>
          </div>

          {/* Subjects Grid */}
          {activePeriodSubjects.length === 0 ? (
            <div style={{
              padding: '48px 24px',
              textAlign: 'center',
              backgroundColor: 'var(--color-warm-linen)',
              borderRadius: '10px',
              border: '1px dashed var(--color-ink)',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-sun-yellow)',
                border: '1.5px solid var(--color-ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
                boxShadow: '2px 2px 0 var(--color-ink)',
              }}>
                <BookOpen size={24} color="var(--color-ink)" />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-ink)', marginBottom: '4px' }}>
                No subjects added to {selectedPeriod?.name || 'this semester'} yet
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-fog)', maxWidth: '440px', margin: '0 auto 16px auto' }}>
                Add the canonical subjects for this semester. You can then allocate faculty to each batch (e.g. Mamta for Batch B, Mahima for B1 lab).
              </p>
              <button
                onClick={handleOpenAdd}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--color-ink)',
                  backgroundColor: 'var(--color-sun-yellow)',
                  color: 'var(--color-ink)',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '3px 3px 0 var(--color-ink)',
                }}
              >
                <Plus size={16} strokeWidth={3} />
                Add First Subject to {selectedPeriod?.name}
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
              {activePeriodSubjects.map((item) => (
                <motion.div
                  key={item._id}
                  layout
                  style={{
                    backgroundColor: 'var(--color-paper-white)',
                    border: '1.5px solid var(--color-ink)',
                    borderRadius: '12px',
                    padding: '18px',
                    boxShadow: '3px 3px 0 var(--color-ink)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    {/* Badges */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '5px',
                        fontSize: '11px',
                        fontWeight: 800,
                        backgroundColor: 'var(--color-sun-yellow)',
                        border: '1px solid var(--color-ink)',
                        letterSpacing: '0.5px',
                      }}>
                        {item.courseId?.code || 'SUBJ'}
                      </span>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor:
                            item.classification === 'theory'
                              ? '#dbeafe'
                              : item.classification === 'practical'
                              ? '#ede9fe'
                              : 'var(--color-electric-lime)',
                          border: '1px solid var(--color-ink)',
                          textTransform: 'capitalize',
                        }}>
                          {item.classification === 'both' ? 'Theory + Lab' : item.classification}
                        </span>

                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: 'var(--color-warm-linen)',
                          border: '1px solid var(--color-ink)',
                        }}>
                          {item.credits} CR
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-ink)', marginBottom: '10px', lineHeight: 1.3 }}>
                      {item.courseId?.title}
                    </h3>

                    {/* Batch Allocation Shortcut Pill */}
                    <div
                      onClick={() => setActiveViewTab('allocation')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        backgroundColor: 'var(--color-warm-linen)',
                        borderRadius: '6px',
                        border: '1px solid var(--color-ink)',
                        marginBottom: '14px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ color: 'var(--color-fog)', fontWeight: 600 }}>Faculty Assignment:</span>
                      <span style={{ color: 'var(--color-ink)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Assign Batches <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>

                  {/* Card actions */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '8px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--color-ink)',
                  }}>
                    <button
                      onClick={() => handleOpenEdit(item)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 10px',
                        borderRadius: '5px',
                        border: '1px solid var(--color-ink)',
                        backgroundColor: 'var(--color-paper-white)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <Edit3 size={13} />
                      Edit
                    </button>

                    <button
                      onClick={() => handleDeleteSubject(item)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 10px',
                        borderRadius: '5px',
                        border: '1px solid #ef4444',
                        backgroundColor: '#fee2e2',
                        color: '#b91c1c',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ─── TAB 2: BATCH & LAB FACULTY ALLOCATION ─────────────────── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeViewTab === 'allocation' && (
        <div style={{
          backgroundColor: 'var(--color-paper-white)',
          border: '1.5px solid var(--color-ink)',
          borderRadius: '14px',
          padding: '24px',
          boxShadow: '4px 4px 0 var(--color-ink)',
        }}>
          {/* Header & Save Action */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--color-ink)',
          }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-ink)', marginBottom: '2px' }}>
                Batch & Lab Faculty Allocation — {selectedPeriod?.name}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--color-fog)' }}>
                Assign professors to batches for Theory lectures, and to practical sub-batches (e.g. B1, B2) for Lab sessions.
              </p>
            </div>

            <button
              onClick={handleSaveAllAllocations}
              disabled={savingAllocations || semesterBatches.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 20px',
                borderRadius: '8px',
                border: '1.5px solid var(--color-ink)',
                backgroundColor: 'var(--color-electric-lime)',
                color: 'var(--color-ink)',
                fontWeight: 800,
                fontSize: '13px',
                cursor: savingAllocations ? 'not-allowed' : 'pointer',
                boxShadow: '3px 3px 0 var(--color-ink)',
              }}
            >
              <Save size={15} strokeWidth={2.5} />
              {savingAllocations ? 'Saving...' : 'Save Faculty Allocations'}
            </button>
          </div>

          {/* If no batches exist yet for this semester */}
          {semesterBatches.length === 0 ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              backgroundColor: 'var(--color-warm-linen)',
              borderRadius: '10px',
              border: '1px dashed var(--color-ink)',
            }}>
              <Users size={32} color="var(--color-fog)" style={{ margin: '0 auto 10px auto' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-ink)', marginBottom: '4px' }}>
                No Teaching Batches in {selectedPeriod?.name} ({activeSession?.name || 'Session'})
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-fog)', maxWidth: '500px', margin: '0 auto 16px auto' }}>
                Create teaching batches (e.g. "Batch A", "Batch B" with practical sub-batches like B1, B2) in Academic Setup to allocate faculty for this semester.
              </p>
              <a
                href="/admin/academic"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-ink)',
                  backgroundColor: 'var(--color-sun-yellow)',
                  color: 'var(--color-ink)',
                  fontWeight: 700,
                  fontSize: '13px',
                  textDecoration: 'none',
                  boxShadow: '2px 2px 0 var(--color-ink)',
                }}
              >
                Go to Academic Setup → Batches
              </a>
            </div>
          ) : activePeriodSubjects.length === 0 ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              backgroundColor: 'var(--color-warm-linen)',
              borderRadius: '10px',
              border: '1px dashed var(--color-ink)',
            }}>
              <BookOpen size={32} color="var(--color-fog)" style={{ margin: '0 auto 10px auto' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-ink)', marginBottom: '4px' }}>
                No subjects defined for {selectedPeriod?.name}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-fog)', marginBottom: '14px' }}>
                Please add subjects in the "Semester Scheme & Subjects" tab first!
              </p>
              <button
                onClick={() => setActiveViewTab('scheme')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-ink)',
                  backgroundColor: 'var(--color-sun-yellow)',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '2px 2px 0 var(--color-ink)',
                }}
              >
                Add Subjects Now
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {activePeriodSubjects.map((item) => {
                const courseId = item.courseId?._id || item.courseId;
                const courseTitle = item.courseId?.title;
                const courseCode = item.courseId?.code;
                const classification = item.classification || 'both';

                return (
                  <div
                    key={item._id}
                    style={{
                      border: '1.5px solid var(--color-ink)',
                      borderRadius: '12px',
                      backgroundColor: 'var(--color-paper-white)',
                      boxShadow: '3px 3px 0 var(--color-ink)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Subject Header */}
                    <div style={{
                      padding: '14px 18px',
                      backgroundColor: 'var(--color-warm-linen)',
                      borderBottom: '1.5px solid var(--color-ink)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '5px',
                          fontSize: '12px',
                          fontWeight: 800,
                          backgroundColor: 'var(--color-sun-yellow)',
                          border: '1px solid var(--color-ink)',
                        }}>
                          {courseCode || 'SUBJ'}
                        </span>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-ink)' }}>
                          {courseTitle}
                        </h3>
                      </div>

                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: 'var(--color-paper-white)',
                        border: '1px solid var(--color-ink)',
                        textTransform: 'capitalize',
                      }}>
                        {classification === 'both' ? 'Theory + Lab' : classification} • {item.credits} Credits
                      </span>
                    </div>

                    {/* Batch Allocations Table */}
                    <div style={{ padding: '16px 18px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '16px' }}>
                        {semesterBatches.map((batch) => {
                          const practicals = batch.practicalGroups || [];

                          return (
                            <div
                              key={batch._id}
                              style={{
                                border: '1px solid var(--color-ink)',
                                borderRadius: '10px',
                                padding: '14px',
                                backgroundColor: 'var(--color-paper-white)',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Users size={16} color="var(--color-ink)" />
                                  <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-ink)' }}>
                                    {batch.name}
                                  </h4>
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--color-fog)', fontWeight: 600 }}>
                                  {practicals.length} practical lab group{practicals.length === 1 ? '' : 's'}
                                </span>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {/* 1. THEORY LECTURE ROW */}
                                {(classification === 'theory' || classification === 'both') && (
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                    padding: '8px 12px',
                                    backgroundColor: '#f8fafc',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        fontWeight: 800,
                                        backgroundColor: '#dbeafe',
                                        color: '#1e40af',
                                        border: '1px solid #93c5fd',
                                      }}>
                                        THEORY
                                      </span>
                                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-ink)' }}>
                                        {batch.name} Lecture
                                      </span>
                                    </div>

                                    <div style={{ width: '220px' }}>
                                      <select
                                        value={allocationForm[`${courseId}_${batch._id}_theory_none`] || ''}
                                        onChange={(e) =>
                                          handleAllocationChange(courseId, batch._id, 'theory', null, e.target.value)
                                        }
                                        style={{
                                          width: '100%',
                                          padding: '6px 10px',
                                          borderRadius: '6px',
                                          border: '1px solid var(--color-ink)',
                                          fontSize: '12px',
                                          fontWeight: 600,
                                          backgroundColor: 'var(--color-paper-white)',
                                        }}
                                      >
                                        <option value="">-- Assign Teacher --</option>
                                        {facultyList.map((f) => (
                                          <option key={f._id} value={f._id}>
                                            {f.name} ({f.role})
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                )}

                                {/* 2. LAB ROWS (For each practical sub-batch e.g. B1, B2) */}
                                {(classification === 'practical' || classification === 'both') && (
                                  <>
                                    {practicals.length > 0 ? (
                                      practicals.map((pg) => (
                                        <div
                                          key={pg._id}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '12px',
                                            padding: '8px 12px',
                                            backgroundColor: '#faf5ff',
                                            borderRadius: '8px',
                                            border: '1px solid #e9d5ff',
                                          }}
                                        >
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{
                                              padding: '2px 6px',
                                              borderRadius: '4px',
                                              fontSize: '10px',
                                              fontWeight: 800,
                                              backgroundColor: '#ede9fe',
                                              color: '#6b21a8',
                                              border: '1px solid #c084fc',
                                            }}>
                                              LAB
                                            </span>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-ink)' }}>
                                              Lab {pg.name}
                                            </span>
                                          </div>

                                          <div style={{ width: '220px' }}>
                                            <select
                                              value={allocationForm[`${courseId}_${batch._id}_lab_${pg._id}`] || ''}
                                              onChange={(e) =>
                                                handleAllocationChange(courseId, batch._id, 'lab', pg._id, e.target.value)
                                              }
                                              style={{
                                                width: '100%',
                                                padding: '6px 10px',
                                                borderRadius: '6px',
                                                border: '1px solid var(--color-ink)',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                backgroundColor: 'var(--color-paper-white)',
                                              }}
                                            >
                                              <option value="">-- Assign Lab Teacher --</option>
                                              {facultyList.map((f) => (
                                                <option key={f._id} value={f._id}>
                                                  {f.name} ({f.role})
                                                </option>
                                              ))}
                                            </select>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      // If batch has no practical sub-batches defined yet
                                      <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '12px',
                                        padding: '8px 12px',
                                        backgroundColor: '#faf5ff',
                                        borderRadius: '8px',
                                        border: '1px solid #e9d5ff',
                                      }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <span style={{
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            fontSize: '10px',
                                            fontWeight: 800,
                                            backgroundColor: '#ede9fe',
                                            color: '#6b21a8',
                                            border: '1px solid #c084fc',
                                          }}>
                                            LAB
                                          </span>
                                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-ink)' }}>
                                            {batch.name} Practical
                                          </span>
                                        </div>

                                        <div style={{ width: '220px' }}>
                                          <select
                                            value={allocationForm[`${courseId}_${batch._id}_lab_none`] || ''}
                                            onChange={(e) =>
                                              handleAllocationChange(courseId, batch._id, 'lab', null, e.target.value)
                                            }
                                            style={{
                                              width: '100%',
                                              padding: '6px 10px',
                                              borderRadius: '6px',
                                              border: '1px solid var(--color-ink)',
                                              fontSize: '12px',
                                              fontWeight: 600,
                                              backgroundColor: 'var(--color-paper-white)',
                                            }}
                                          >
                                            <option value="">-- Assign Lab Teacher --</option>
                                            {facultyList.map((f) => (
                                              <option key={f._id} value={f._id}>
                                                {f.name} ({f.role})
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── ADD / EDIT SUBJECT MODAL ─── */}
      <AnimatePresence>
        {showAddModal && (
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
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'var(--color-paper-white)',
                border: '2px solid var(--color-ink)',
                borderRadius: '14px',
                padding: '28px',
                width: '100%',
                maxWidth: '520px',
                boxShadow: '6px 6px 0 var(--color-ink)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-ink)' }}>
                    {editingItem ? 'Edit Curriculum Subject' : `Add Subject to ${selectedPeriod?.name}`}
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--color-fog)' }}>
                    {selectedProgram?.name} ({selectedProgram?.code})
                  </p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-ink)',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Mode switch tabs */}
              {!editingItem && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', padding: '4px', backgroundColor: 'var(--color-warm-linen)', borderRadius: '8px', border: '1px solid var(--color-ink)' }}>
                  <button
                    type="button"
                    onClick={() => setModalMode('catalog')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      border: modalMode === 'catalog' ? '1px solid var(--color-ink)' : 'none',
                      backgroundColor: modalMode === 'catalog' ? 'var(--color-paper-white)' : 'transparent',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      boxShadow: modalMode === 'catalog' ? '2px 2px 0 var(--color-ink)' : 'none',
                    }}
                  >
                    Pick Existing Course ({availableCatalogCourses.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalMode('new')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      border: modalMode === 'new' ? '1px solid var(--color-ink)' : 'none',
                      backgroundColor: modalMode === 'new' ? 'var(--color-paper-white)' : 'transparent',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      boxShadow: modalMode === 'new' ? '2px 2px 0 var(--color-ink)' : 'none',
                    }}
                  >
                    + Create New Subject
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmitSubject} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {modalMode === 'catalog' && !editingItem ? (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                      Select Subject from Course Catalog
                    </label>
                    {availableCatalogCourses.length === 0 ? (
                      <p style={{ fontSize: '13px', color: '#b91c1c', padding: '8px', backgroundColor: '#fee2e2', borderRadius: '6px', border: '1px solid #ef4444' }}>
                        All catalog courses have already been added to this semester. Switch to "Create New Subject" to define a new one!
                      </p>
                    ) : (
                      <select
                        required
                        value={formData.courseId}
                        onChange={(e) => {
                          const cId = e.target.value;
                          const found = coursesCatalog.find((c) => c._id === cId);
                          setFormData({
                            ...formData,
                            courseId: cId,
                            credits: found?.credits || 4,
                            classification: found?.classification || 'both',
                          });
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: '1.5px solid var(--color-ink)',
                          fontWeight: 600,
                          fontSize: '14px',
                        }}
                      >
                        <option value="">-- Choose Course --</option>
                        {availableCatalogCourses.map((c) => (
                          <option key={c._id} value={c._id}>
                            [{c.code || 'NO-CODE'}] {c.title} ({c.credits || 4} CR)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : modalMode === 'new' && !editingItem ? (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                        Subject Title *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Computer Organization & Architecture"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '6px',
                          border: '1.5px solid var(--color-ink)',
                          fontWeight: 600,
                          fontSize: '14px',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                        Subject Code (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. CS301"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '6px',
                          border: '1.5px solid var(--color-ink)',
                          fontWeight: 600,
                          fontSize: '14px',
                        }}
                      />
                    </div>
                  </>
                ) : null}

                {/* Credits & Classification */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                      Credits
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      required
                      value={formData.credits}
                      onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '6px',
                        border: '1.5px solid var(--color-ink)',
                        fontWeight: 600,
                        fontSize: '14px',
                      }}
                    />
                  </div>

                  <div style={{ flex: 1.5 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                      Classification
                    </label>
                    <select
                      value={formData.classification}
                      onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '6px',
                        border: '1.5px solid var(--color-ink)',
                        fontWeight: 600,
                        fontSize: '14px',
                      }}
                    >
                      <option value="both">Theory + Practical (Both)</option>
                      <option value="theory">Theory Only</option>
                      <option value="practical">Practical Only (Lab)</option>
                    </select>
                  </div>
                </div>

                <div style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--color-warm-linen)',
                  borderRadius: '8px',
                  border: '1px solid var(--color-ink)',
                  fontSize: '12px',
                  color: 'var(--color-ink)',
                }}>
                  💡 <strong>Batch Faculty Allocation</strong>: You will allocate teachers per batch (e.g. Mamta for Batch B, Mahima for Lab B1) in the next tab.
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    style={{
                      padding: '9px 16px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-ink)',
                      backgroundColor: 'transparent',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || (modalMode === 'catalog' && !editingItem && !formData.courseId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 20px',
                      borderRadius: '6px',
                      border: '1.5px solid var(--color-ink)',
                      backgroundColor: 'var(--color-sun-yellow)',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      boxShadow: '2px 2px 0 var(--color-ink)',
                    }}
                  >
                    {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add to Curriculum'}
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

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { classroomsAPI, assignmentsAPI, aiAPI } from '../services/api';
import { ArrowLeft, Save, Plus, Trash2, Loader2, Sparkles, X, CheckCircle2 } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';

export default function AssignmentBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [classrooms, setClassrooms] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    dueDate: '',
    maxMarks: 10,
    classroomId: '',
    questions: [],
  });

  // AI Modal state
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState('medium');

  useEffect(() => {
    fetchClassrooms();
    if (isEditing) {
      fetchAssignment();
    }
  }, [id]);

  // Auto-calculate Total Marks based on questions
  useEffect(() => {
    if (formData.questions.length > 0) {
      const calculatedTotal = formData.questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
      if (calculatedTotal !== formData.maxMarks) {
        setFormData(prev => ({ ...prev, maxMarks: calculatedTotal }));
      }
    }
  }, [formData.questions]);

  const fetchClassrooms = async () => {
    try {
      const res = await classroomsAPI.list();
      if (res.success) setClassrooms(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAssignment = async () => {
    try {
      const res = await assignmentsAPI.getById(id);
      if (res.success) {
        const assignment = res.data;
        setFormData({
          title: assignment.title,
          description: assignment.description || '',
          startDate: new Date(assignment.startDate).toISOString().split('T')[0],
          dueDate: new Date(assignment.dueDate).toISOString().split('T')[0],
          maxMarks: assignment.maxMarks,
          classroomId: assignment.classroomId,
          questions: assignment.questions || [],
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addQuestion = () => {
    setFormData((prev) => ({
      ...prev,
      questions: [...prev.questions, { 
        text: '', 
        options: ['', '', '', ''], 
        correctOptionIndex: 0, 
        marks: 1 
      }],
    }));
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...formData.questions];
    newQuestions[index][field] = value;
    setFormData((prev) => ({ ...prev, questions: newQuestions }));
  };

  const updateOption = (qIndex, optIndex, value) => {
    const newQuestions = [...formData.questions];
    newQuestions[qIndex].options[optIndex] = value;
    setFormData((prev) => ({ ...prev, questions: newQuestions }));
  };

  const removeQuestion = (index) => {
    const newQuestions = formData.questions.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, questions: newQuestions }));
  };

  const handleGenerateAI = async () => {
    if (!aiTopic) return alert('Topic is required');
    setAiLoading(true);
    try {
      const res = await aiAPI.generateQuestions({
        topic: aiTopic,
        count: aiCount,
        difficulty: aiDifficulty,
      });
      if (res.success && Array.isArray(res.data)) {
        const safeQuestions = res.data.map(q => ({
          text: q.text || '',
          options: Array.isArray(q.options) ? [...q.options, '', '', '', ''].slice(0, 4) : ['', '', '', ''],
          correctOptionIndex: typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : 0,
          marks: q.marks || 1
        }));
        
        setFormData((prev) => ({
          ...prev,
          questions: [...prev.questions, ...safeQuestions],
        }));
        setShowAiModal(false);
        setAiTopic('');
      }
    } catch (err) {
      alert(err.message || 'Failed to generate questions');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.startDate || !formData.dueDate || !formData.classroomId) {
      return alert('Please fill all required fields (Title, Dates, Classroom)');
    }

    setSaving(true);
    try {
      if (isEditing) {
        await assignmentsAPI.update(id, formData);
      } else {
        await assignmentsAPI.create(formData.classroomId, formData);
      }
      navigate('/admin/assignments');
    } catch (err) {
      alert(err.message || 'Failed to save assignment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <div className="admin-spinner" />
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/admin/assignments')}
          style={{
            padding: '8px',
            borderRadius: '8px',
            border: '1px solid var(--color-ink)',
            backgroundColor: 'var(--color-paper-white)',
            cursor: 'pointer',
            display: 'flex',
          }}
        >
          <ArrowLeft size={20} color="var(--color-ink)" />
        </motion.button>
        <h1 style={{ color: 'var(--color-ink)', fontSize: '24px', letterSpacing: '-0.5px', flex: 1, fontWeight: 600 }}>
          {isEditing ? 'Edit Assignment' : 'Create MCQ Assignment'}
        </h1>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSubmit}
          disabled={saving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 24px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-ink)',
            color: 'var(--color-pure-white)',
            border: 'none',
            fontSize: '14px',
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
            boxShadow: '2px 2px 0px rgba(0,0,0,0.2)',
          }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isEditing ? 'Update' : 'Publish'}
        </motion.button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
        {/* Left Column - Questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{
            backgroundColor: 'var(--color-paper-white)',
            padding: '32px',
            borderRadius: 'var(--radius-cards)',
            border: '1px solid var(--color-ink)',
            boxShadow: '4px 4px 0px var(--color-ink)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '20px', color: 'var(--color-ink)', fontWeight: 600 }}>Questions ({formData.questions.length})</h2>
              <div style={{ display: 'flex', gap: '12px' }}>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={addQuestion}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-ink)',
                    backgroundColor: 'var(--color-pure-white)',
                    color: 'var(--color-ink)',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={16} /> Add Manual
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAiModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-ink)',
                    background: 'linear-gradient(135deg, #ffde3b, #c1f32b)',
                    color: 'var(--color-ink)',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Sparkles size={16} /> Generate AI
                </motion.button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <AnimatePresence>
                {formData.questions.map((q, qIdx) => (
                  <motion.div
                    key={qIdx}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      padding: '24px',
                      backgroundColor: 'var(--color-pure-white)',
                      borderRadius: '12px',
                      border: '1px solid var(--color-ink)',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-ink)',
                        color: 'var(--color-pure-white)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: 600,
                        flexShrink: 0,
                      }}>
                        {qIdx + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <textarea
                          value={q.text}
                          onChange={(e) => updateQuestion(qIdx, 'text', e.target.value)}
                          placeholder="Enter question text here..."
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: '1px solid var(--color-ink)',
                            backgroundColor: 'var(--color-paper-white)',
                            color: 'var(--color-ink)',
                            fontSize: '15px',
                            minHeight: '80px',
                            resize: 'vertical',
                            marginBottom: '16px',
                            outline: 'none',
                          }}
                        />
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Options & Correct Answer
                          </label>
                          {q.options.map((opt, optIdx) => (
                            <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <input
                                type="radio"
                                name={`correct-${qIdx}`}
                                checked={q.correctOptionIndex === optIdx}
                                onChange={() => updateQuestion(qIdx, 'correctOptionIndex', optIdx)}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  accentColor: 'var(--color-ink)',
                                  cursor: 'pointer'
                                }}
                              />
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                                placeholder={`Option ${optIdx + 1}`}
                                style={{
                                  flex: 1,
                                  padding: '10px 14px',
                                  borderRadius: '8px',
                                  border: q.correctOptionIndex === optIdx ? '2px solid var(--color-ink)' : '1px solid rgba(0,0,0,0.15)',
                                  backgroundColor: q.correctOptionIndex === optIdx ? 'rgba(193,243,43,0.1)' : 'var(--color-pure-white)',
                                  fontSize: '14px',
                                  outline: 'none',
                                  transition: 'all 0.2s ease'
                                }}
                              />
                              {q.correctOptionIndex === optIdx && (
                                <CheckCircle2 size={18} color="var(--color-ink)" />
                              )}
                            </div>
                          ))}
                        </div>

                      </div>
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      paddingTop: '16px',
                      borderTop: '1px solid rgba(0,0,0,0.1)',
                      marginTop: '16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>Marks:</span>
                        <input
                          type="number"
                          value={q.marks}
                          onChange={(e) => updateQuestion(qIdx, 'marks', Number(e.target.value))}
                          style={{
                            width: '70px',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--color-ink)',
                            backgroundColor: 'var(--color-pure-white)',
                            fontSize: '14px',
                            fontWeight: 600,
                          }}
                          min="1"
                        />
                      </div>
                      <button
                        onClick={() => removeQuestion(qIdx)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: 'rgba(255,107,107,0.1)',
                          color: '#d32f2f',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                        }}
                      >
                        <Trash2 size={16} /> Remove
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {formData.questions.length === 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 0', 
                  color: 'var(--color-fog)', 
                  fontSize: '15px',
                  backgroundColor: 'var(--color-pure-white)',
                  borderRadius: '12px',
                  border: '1px dashed var(--color-fog)'
                }}>
                  No MCQs added yet. Start manually or generate with AI!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'sticky', top: '24px' }}>
          <div style={{
            backgroundColor: 'var(--color-paper-white)',
            padding: '28px',
            borderRadius: 'var(--radius-cards)',
            border: '1px solid var(--color-ink)',
            boxShadow: '4px 4px 0px var(--color-ink)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}>
            <h2 style={{ fontSize: '18px', color: 'var(--color-ink)', fontWeight: 600, borderBottom: '2px solid var(--color-ink)', paddingBottom: '12px' }}>
              Assignment Settings
            </h2>
            
            {!isEditing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label className="admin-label">Select Classroom / Batch</label>
                <CustomSelect
                  name="classroomId"
                  value={formData.classroomId}
                  onChange={handleChange}
                  placeholder="-- Choose Classroom --"
                  options={classrooms.map(c => {
                    const batchStr = c.type === 'lab' && c.labBatch 
                      ? `Batch ${c.classBatch} (${c.labBatch}) - Lab` 
                      : `Batch ${c.classBatch} - Theory`;
                    return {
                      value: c._id,
                      label: `${c.courseId?.title} - ${batchStr}`
                    };
                  })}
                />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="admin-label">Title</label>
              <input
                type="text"
                className="admin-input"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Midterm MCQs"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="admin-label">Description</label>
              <textarea
                className="admin-input"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Instructions for students..."
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="admin-label">Start Date</label>
              <input
                type="date"
                className="admin-input"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="admin-label">End Date</label>
              <input
                type="date"
                className="admin-input"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="admin-label" style={{ marginBottom: 0 }}>Total Marks</label>
                {formData.questions.length > 0 && (
                  <span style={{ fontSize: '11px', color: 'var(--color-fog)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Auto-calculated
                  </span>
                )}
              </div>
              <input
                type="number"
                className="admin-input"
                name="maxMarks"
                value={formData.maxMarks}
                onChange={handleChange}
                min="1"
                readOnly={formData.questions.length > 0}
                style={{ 
                  backgroundColor: formData.questions.length > 0 ? 'rgba(0,0,0,0.02)' : 'var(--color-pure-white)',
                  color: formData.questions.length > 0 ? 'var(--color-fog)' : 'var(--color-ink)',
                  cursor: formData.questions.length > 0 ? 'not-allowed' : 'text'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* AI Modal */}
      {showAiModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 15, 18, 0.4)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            style={{
              backgroundColor: 'var(--color-paper-white)',
              padding: '32px',
              borderRadius: '24px',
              border: '2px solid var(--color-ink)',
              width: '440px',
              maxWidth: '90vw',
              boxShadow: '12px 12px 0px var(--color-ink)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ 
                  width: '36px', height: '36px', 
                  borderRadius: '10px', 
                  background: 'linear-gradient(135deg, #ffde3b, #ff4dd5)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center' 
                }}>
                  <Sparkles color="#0f0f12" size={18} />
                </div>
                <h3 style={{ fontSize: '20px', color: 'var(--color-ink)', fontWeight: 700, letterSpacing: '-0.5px' }}>
                  AI Generator
                </h3>
              </div>
              <button 
                onClick={() => setShowAiModal(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                disabled={aiLoading}
              >
                <X size={24} color={aiLoading ? "var(--color-fog)" : "var(--color-ink)"} style={{ opacity: aiLoading ? 0.5 : 1 }} />
              </button>
            </div>

            {/* Progress Bar */}
            <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '2px', marginBottom: '24px', overflow: 'hidden' }}>
              {aiLoading && (
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                  style={{
                    width: '50%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, #ff4dd5, #ffde3b, transparent)',
                    borderRadius: '2px'
                  }}
                />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              <label className="admin-label">Topic</label>
              <input
                type="text"
                className="admin-input"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="e.g. Data Structures, Quantum Physics"
              />
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <label className="admin-label">Count</label>
                <input
                  type="number"
                  className="admin-input"
                  value={aiCount}
                  onChange={(e) => setAiCount(Number(e.target.value))}
                  min="1" max="20"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <label className="admin-label">Difficulty</label>
                <CustomSelect
                  name="difficulty"
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(e.target.value)}
                  placeholder="Select..."
                  options={[
                    { value: 'easy', label: 'Easy' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'hard', label: 'Hard' }
                  ]}
                />
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleGenerateAI}
              disabled={aiLoading || !aiTopic}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                border: '2px solid var(--color-ink)',
                background: 'var(--color-ink)',
                color: 'var(--color-pure-white)',
                fontSize: '16px',
                fontWeight: 700,
                cursor: aiLoading || !aiTopic ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                opacity: aiLoading || !aiTopic ? 0.7 : 1,
              }}
            >
              {aiLoading ? (
                <>
                  <Loader2 size={20} className="admin-spin" /> Cooking MCQs...
                </>
              ) : (
                <>
                  <Sparkles size={20} /> Generate MCQs
                </>
              )}
            </motion.button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

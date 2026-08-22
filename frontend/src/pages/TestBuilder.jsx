import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { classroomsAPI, testsAPI, aiAPI } from '../services/api';
import { ArrowLeft, Save, Plus, Trash2, Clock, CheckCircle, Sparkles, X, Loader } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';

export default function TestBuilder() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    classroomId: '',
    testType: 'standard',
    status: 'draft',
    timeLimit: 0,
    questions: []
  });

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiType, setAiType] = useState('mcq');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const questionsEndRef = useRef(null);

  useEffect(() => {
    fetchClassrooms();
    if (isEditing) {
      fetchTest();
    }
  }, [id]);

  const fetchClassrooms = async () => {
    try {
      const res = await classroomsAPI.list();
      if (res.success) setClassrooms(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTest = async () => {
    try {
      const res = await testsAPI.getById(id);
      if (res.success) {
        const test = res.data;
        setFormData({
          title: test.title,
          description: test.description || '',
          classroomId: test.classroomId._id,
          testType: test.testType,
          status: test.status,
          timeLimit: test.timeLimit || 0,
          questions: test.questions || []
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const classroomOptions = classrooms.map(c => ({
    value: c._id,
    label: `${c.courseId?.title || 'Unknown'} - Batch ${c.classBatch}${c.labBatch ? ` / Sub ${c.labBatch}` : ''}`
  }));

  const testTypeOptions = [
    { value: 'standard', label: 'Standard Test' },
    { value: 'time-based', label: 'Strict Time-Based Test' },
    { value: 'live-fastest-finger', label: 'Live: Fastest Finger First' },
    { value: 'live-round-robin', label: 'Live: Round Robin' },
  ];

  const statusOptions = [
    { value: 'draft', label: 'Draft (Hidden)' },
    { value: 'published', label: 'Published (Available)' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddQuestion = (type) => {
    const newQ = {
      id: Date.now().toString(), // temporary id for react key
      questionType: type,
      text: '',
      points: 1,
      options: type === 'mcq' ? ['', '', '', ''] : [],
      correctOptionIndex: type === 'mcq' ? 0 : null,
      codingLanguage: 'javascript',
      codingTemplate: '',
      testCases: type === 'coding' ? [{ input: '', expectedOutput: '', isHidden: false }] : []
    };
    setFormData(prev => ({ ...prev, questions: [...prev.questions, newQ] }));
    
    // Auto-scroll to the new question after state updates
    setTimeout(() => {
      questionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return setAiError('Prompt cannot be empty');
    setAiLoading(true);
    setAiError('');
    try {
      const res = await aiAPI.generateQuestion({ prompt: aiPrompt, type: aiType });
      if (res.success && res.data) {
        const generated = res.data;
        const newQ = {
          id: Date.now().toString(),
          questionType: aiType,
          text: generated.text || '',
          points: 1,
          options: generated.options || (aiType === 'mcq' ? ['', '', '', ''] : []),
          correctOptionIndex: generated.correctOptionIndex !== undefined ? generated.correctOptionIndex : (aiType === 'mcq' ? 0 : null),
          codingLanguage: generated.codingLanguage || 'javascript',
          codingTemplate: generated.codingTemplate || '',
          testCases: generated.testCases || (aiType === 'coding' ? [{ input: '', expectedOutput: '', isHidden: false }] : [])
        };
        setFormData(prev => ({ ...prev, questions: [...prev.questions, newQ] }));
        setAiModalOpen(false);
        setAiPrompt('');
        setTimeout(() => {
          questionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      setAiError(err.response?.data?.message || 'Failed to generate question');
    } finally {
      setAiLoading(false);
    }
  };

  const handleUpdateQuestion = (index, field, value) => {
    const newQs = [...formData.questions];
    newQs[index][field] = value;
    setFormData(prev => ({ ...prev, questions: newQs }));
  };

  const handleRemoveQuestion = (index) => {
    const newQs = formData.questions.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, questions: newQs }));
  };

  const handleUpdateOption = (qIndex, optIndex, val) => {
    const newQs = [...formData.questions];
    newQs[qIndex].options[optIndex] = val;
    setFormData(prev => ({ ...prev, questions: newQs }));
  };

  const handleAddTestCase = (qIndex) => {
    const newQs = [...formData.questions];
    newQs[qIndex].testCases.push({ input: '', expectedOutput: '', isHidden: true });
    setFormData(prev => ({ ...prev, questions: newQs }));
  };

  const handleUpdateTestCase = (qIndex, tcIndex, field, value) => {
    const newQs = [...formData.questions];
    newQs[qIndex].testCases[tcIndex][field] = value;
    setFormData(prev => ({ ...prev, questions: newQs }));
  };

  const handleRemoveTestCase = (qIndex, tcIndex) => {
    const newQs = [...formData.questions];
    newQs[qIndex].testCases = newQs[qIndex].testCases.filter((_, i) => i !== tcIndex);
    setFormData(prev => ({ ...prev, questions: newQs }));
  };

  const isFormValid = formData.title.trim() !== '' && formData.classroomId !== '' && formData.questions.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    setError('');
    setLoading(true);
    try {
      if (isEditing) {
        await testsAPI.update(id, formData);
      } else {
        await testsAPI.create(formData.classroomId, formData);
      }
      navigate('/admin/tests');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px', paddingBottom: '120px' }}>
      <button
        onClick={() => navigate('/admin/tests')}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', color: 'var(--color-fog)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '24px' }}
      >
        <ArrowLeft size={16} /> Back to Tests
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: 'var(--color-ink)', letterSpacing: '-1px', marginBottom: '8px' }}>
            {isEditing ? 'Edit Test' : 'Create New Test'}
          </h1>
          <p style={{ color: 'var(--color-fog)', fontSize: '15px' }}>
            Configure your quiz, time limits, and add questions.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '24px', fontWeight: 500, border: '2px solid #991b1b' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column: Questions Builder */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {formData.questions.length === 0 ? (
            <div style={{ padding: '60px 40px', backgroundColor: 'var(--color-paper-white)', borderRadius: '16px', border: '2px dashed var(--color-fog)', textAlign: 'center' }}>
              <h3 style={{ fontSize: '18px', color: 'var(--color-ink)', marginBottom: '8px' }}>No Questions Yet</h3>
              <p style={{ color: 'var(--color-fog)', fontSize: '14px', marginBottom: '0px' }}>Use the action bar below to add your first question.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {formData.questions.map((q, index) => (
                <div key={q.id || index} style={{ backgroundColor: 'var(--color-paper-white)', padding: '24px', borderRadius: '16px', border: '2px solid var(--color-ink)', boxShadow: '4px 4px 0px var(--color-ink)' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ backgroundColor: 'var(--color-ink)', color: 'white', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px' }}>
                        {index + 1}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-fog)', letterSpacing: '1px' }}>
                        {q.questionType.replace('-', ' ')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-fog)' }}>Pts:</span>
                        <input
                          type="number"
                          value={q.points}
                          onChange={(e) => handleUpdateQuestion(index, 'points', Number(e.target.value))}
                          style={{ width: '60px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--color-ink)' }}
                        />
                      </div>
                      <button onClick={() => handleRemoveQuestion(index)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <textarea
                    placeholder="Enter the question here..."
                    className="admin-input"
                    value={q.text}
                    onChange={(e) => handleUpdateQuestion(index, 'text', e.target.value)}
                    style={{ width: '100%', minHeight: '80px', marginBottom: '16px', boxSizing: 'border-box' }}
                  />

                  {q.questionType === 'mcq' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            onClick={() => handleUpdateQuestion(index, 'correctOptionIndex', oIdx)}
                            style={{
                              width: '24px', height: '24px', borderRadius: '50%',
                              border: `2px solid ${q.correctOptionIndex === oIdx ? 'var(--color-sun-yellow)' : 'var(--color-fog)'}`,
                              backgroundColor: q.correctOptionIndex === oIdx ? 'var(--color-ink)' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                            }}
                          >
                            {q.correctOptionIndex === oIdx && <CheckCircle size={14} color="var(--color-sun-yellow)" />}
                          </div>
                          <input
                            type="text"
                            className="admin-input"
                            value={opt}
                            onChange={(e) => handleUpdateOption(index, oIdx, e.target.value)}
                            placeholder={`Option ${oIdx + 1}`}
                            style={{ flex: 1, padding: '8px 12px' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {q.questionType === 'coding' && (
                    <div style={{ marginTop: '16px', borderTop: '1px dashed var(--color-fog)', paddingTop: '16px' }}>
                      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                        <div style={{ flex: 1 }}>
                          <label className="admin-label">Language</label>
                          <input
                            type="text"
                            list={`language-options-${index}`}
                            className="admin-input"
                            value={q.codingLanguage}
                            onChange={(e) => handleUpdateQuestion(index, 'codingLanguage', e.target.value)}
                            placeholder="e.g. JavaScript, Rust, Go, Python"
                            style={{ width: '100%', boxSizing: 'border-box' }}
                          />
                          <datalist id={`language-options-${index}`}>
                            <option value="javascript" />
                            <option value="python" />
                            <option value="c" />
                            <option value="cpp" />
                            <option value="java" />
                            <option value="assembly" />
                            <option value="ruby" />
                            <option value="rust" />
                            <option value="go" />
                            <option value="typescript" />
                            <option value="php" />
                            <option value="swift" />
                            <option value="kotlin" />
                            <option value="csharp" />
                          </datalist>
                        </div>
                      </div>
                      
                      <div style={{ marginBottom: '16px' }}>
                        <label className="admin-label">Starting Template Code (Optional)</label>
                        <textarea
                          className="admin-input"
                          value={q.codingTemplate}
                          onChange={(e) => handleUpdateQuestion(index, 'codingTemplate', e.target.value)}
                          style={{ width: '100%', minHeight: '120px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                          placeholder="function solve(arr) {&#10;  // write code here&#10;}"
                        />
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <label className="admin-label" style={{ marginBottom: 0 }}>Test Cases</label>
                          <button onClick={() => handleAddTestCase(index)} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', background: 'var(--color-ink)', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
                            <Plus size={14} /> Add Test Case
                          </button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {q.testCases.map((tc, tcIdx) => (
                            <div key={tcIdx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '12px', alignItems: 'start', backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                              <div>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-fog)', textTransform: 'uppercase' }}>Input</span>
                                <input type="text" className="admin-input" value={tc.input} onChange={e => handleUpdateTestCase(index, tcIdx, 'input', e.target.value)} placeholder="e.g. 5, 2" style={{ padding: '6px 8px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }} />
                              </div>
                              <div>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-fog)', textTransform: 'uppercase' }}>Expected Output</span>
                                <input type="text" className="admin-input" value={tc.expectedOutput} onChange={e => handleUpdateTestCase(index, tcIdx, 'expectedOutput', e.target.value)} placeholder="e.g. 7" style={{ padding: '6px 8px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }} />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-fog)', textTransform: 'uppercase' }}>Hidden</span>
                                <input type="checkbox" checked={tc.isHidden} onChange={e => handleUpdateTestCase(index, tcIdx, 'isHidden', e.target.checked)} style={{ marginTop: '8px', cursor: 'pointer' }} />
                              </div>
                              <button onClick={() => handleRemoveTestCase(index, tcIdx)} style={{ marginTop: '16px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16}/></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              ))}
              <div ref={questionsEndRef} />
            </div>
          )}

          {/* Sticky Bottom Question Bar */}
          <div style={{
            position: 'sticky', bottom: '32px',
            backgroundColor: 'var(--color-paper-white)', padding: '16px 24px', borderRadius: '100px',
            border: '2px solid var(--color-ink)', boxShadow: '0px 8px 16px rgba(0,0,0,0.1), 4px 4px 0px var(--color-ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', zIndex: 10,
            alignSelf: 'center'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ backgroundColor: 'var(--color-ink)', color: 'white', padding: '2px 8px', borderRadius: '12px' }}>{formData.questions.length}</span>
              Questions Added
            </div>
            <div style={{ width: '2px', height: '24px', backgroundColor: 'var(--color-fog)', opacity: 0.3 }} />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => handleAddQuestion('mcq')} className="admin-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '100px' }}>
                <Plus size={16} /> Add MCQ
              </button>
              <button onClick={() => handleAddQuestion('coding')} className="admin-btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '100px', backgroundColor: 'transparent' }}>
                <Plus size={16} /> Add Coding Problem
              </button>
              <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-fog)', opacity: 0.3, margin: '0 4px' }} />
              <button onClick={() => setAiModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '100px', backgroundColor: '#fffbeb', color: '#b45309', border: '2px solid #fde68a', fontWeight: 600, cursor: 'pointer', transition: 'all 0.1s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef3c7'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fffbeb'}>
                <Sparkles size={16} /> AI Assist
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Test Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '24px' }}>
          
          <div style={{ backgroundColor: 'var(--color-paper-white)', padding: '24px', borderRadius: '16px', border: '2px solid var(--color-ink)', boxShadow: '4px 4px 0px var(--color-ink)' }}>
            <h2 style={{ fontSize: '18px', color: 'var(--color-ink)', fontWeight: 700, borderBottom: '2px solid var(--color-ink)', paddingBottom: '12px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Test Settings
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-fog)', backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: '6px' }}>
                Status: {formData.status}
              </span>
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div>
                <label className="admin-label">Test Title</label>
                <input type="text" name="title" className="admin-input" value={formData.title} onChange={handleChange} placeholder="e.g. Midterm Physics" style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>

              {!isEditing && (
                <div>
                  <label className="admin-label">Classroom / Batch</label>
                  <CustomSelect name="classroomId" options={classroomOptions} value={formData.classroomId} onChange={handleChange} placeholder="Select target batch..." />
                </div>
              )}

              <div>
                <label className="admin-label">Test Type</label>
                <CustomSelect name="testType" options={testTypeOptions} value={formData.testType} onChange={handleChange} />
              </div>

              {(formData.testType === 'time-based' || formData.testType.startsWith('live')) && (
                <div>
                  <label className="admin-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={16} /> Time Limit (Minutes)
                  </label>
                  <input type="number" name="timeLimit" className="admin-input" value={formData.timeLimit} onChange={handleChange} placeholder="e.g. 30" style={{ width: '100%', boxSizing: 'border-box' }} />
                  <span style={{ fontSize: '12px', color: 'var(--color-fog)', marginTop: '4px', display: 'block' }}>Enter 0 for unlimited time.</span>
                </div>
              )}

              <div>
                <label className="admin-label">Description / Instructions</label>
                <textarea name="description" className="admin-input" value={formData.description} onChange={handleChange} placeholder="Brief instructions for students..." style={{ width: '100%', minHeight: '80px', boxSizing: 'border-box' }} />
              </div>
              
              <div style={{ borderTop: '1px dashed var(--color-fog)', paddingTop: '16px' }}>
                <label className="admin-label">Visibility</label>
                <CustomSelect name="status" options={statusOptions} value={formData.status} onChange={handleChange} />
              </div>

            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !isFormValid}
            className={isFormValid ? "admin-btn-primary" : "admin-btn-outline"}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', fontSize: '16px', 
              opacity: loading || !isFormValid ? 0.6 : 1, cursor: isFormValid ? 'pointer' : 'not-allowed',
              backgroundColor: isFormValid ? 'var(--color-ink)' : '#f3f4f6',
              color: isFormValid ? 'white' : 'var(--color-fog)',
              border: isFormValid ? 'none' : '2px dashed var(--color-fog)',
              borderRadius: '12px'
            }}
          >
            {loading ? <div className="admin-spinner" style={{ width: '18px', height: '18px', borderTopColor: 'var(--color-sun-yellow)' }} /> : <Save size={18} />}
            {isEditing ? 'Save Changes' : 'Publish Test'}
          </button>

        </div>
      </div>

      {/* AI Modal */}
      {aiModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 15, 18, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'var(--color-paper-white)', padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '500px',
            border: '2px solid var(--color-ink)', boxShadow: '8px 8px 0px var(--color-ink)', position: 'relative'
          }}>
            <button onClick={() => setAiModalOpen(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-fog)' }}>
              <X size={24} />
            </button>
            
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px', color: 'var(--color-ink)', marginBottom: '8px' }}>
              <Sparkles size={24} color="#f59e0b" /> AI Generator
            </h2>
            <p style={{ color: 'var(--color-fog)', fontSize: '15px', marginBottom: '24px' }}>Describe the question you want, and Gemini will build it.</p>

            {aiError && (
              <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', fontWeight: 500 }}>
                {aiError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="admin-label">Question Type</label>
                <select className="admin-input" value={aiType} onChange={(e) => setAiType(e.target.value)} style={{ width: '100%' }}>
                  <option value="mcq">Multiple Choice</option>
                  <option value="coding">Coding Problem (with Test Cases)</option>
                </select>
              </div>

              <div>
                <label className="admin-label">Prompt</label>
                <textarea
                  className="admin-input"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., Create a medium difficulty Python problem to traverse a binary tree..."
                  style={{ width: '100%', minHeight: '120px', boxSizing: 'border-box' }}
                />
              </div>

              <button
                onClick={handleGenerateAI}
                disabled={aiLoading}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '12px',
                  backgroundColor: '#f59e0b', color: 'white', border: 'none', fontSize: '16px', fontWeight: 600, cursor: aiLoading ? 'not-allowed' : 'pointer',
                  opacity: aiLoading ? 0.7 : 1, marginTop: '8px'
                }}
              >
                {aiLoading ? <Loader className="animate-spin" size={20} /> : <Sparkles size={20} />}
                {aiLoading ? 'Generating...' : 'Generate with Gemini'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

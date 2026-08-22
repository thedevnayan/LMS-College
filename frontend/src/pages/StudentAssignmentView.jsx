import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assignmentsAPI } from '../services/api';
import { ArrowLeft, FileText, CheckCircle, Clock, Send } from 'lucide-react';

export default function StudentAssignmentView() {
  const { classroomId, assignmentId } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [comment, setComment] = useState('');
  const [answers, setAnswers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        const res = await assignmentsAPI.getById(assignmentId);
        if (res.success) {
          setAssignment(res.data);
          
          if (res.data.submission) {
            setSubmitSuccess(true);
            setComment(res.data.submission.comment || '');
            if (res.data.submission.answers && res.data.submission.answers.length > 0) {
              setAnswers(res.data.submission.answers);
            } else if (res.data.questions) {
              setAnswers(new Array(res.data.questions.length).fill(null));
            }
          } else if (res.data.questions) {
            setAnswers(new Array(res.data.questions.length).fill(null));
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load assignment');
      } finally {
        setLoading(false);
      }
    };
    fetchAssignment();
  }, [assignmentId]);

  const handleOptionSelect = (qIdx, optIdx) => {
    if (submitSuccess) return;
    const newAnswers = [...answers];
    newAnswers[qIdx] = optIdx;
    setAnswers(newAnswers);
  };

  const confirmSubmit = (e) => {
    if (e) e.preventDefault();
    if (!comment.trim() && (!assignment.questions || assignment.questions.length === 0)) return;
    setShowConfirmModal(true);
  };

  const executeSubmit = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await assignmentsAPI.submit(assignmentId, { comment, answers });
      if (res.success) {
        setSubmitSuccess(true);
      }
    } catch (err) {
      if (err.code === 'ALREADY_SUBMITTED') {
        setSubmitSuccess(true); // If they reload and try again
      } else {
        setSubmitError(err.message || 'Failed to submit assignment');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-fog)' }}>Loading assignment...</div>;
  }

  if (error || !assignment) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ color: '#991b1b', marginBottom: '16px' }}>{error || 'Assignment not found'}</div>
        <button className="admin-btn-secondary" onClick={() => navigate(`/classrooms/${classroomId}`)}>Go Back</button>
      </div>
    );
  }

  const isLate = new Date() > new Date(assignment.dueDate);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <button 
        onClick={() => navigate(`/classrooms/${classroomId}`)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--color-fog)', fontWeight: 600, cursor: 'pointer', padding: '0', marginBottom: '24px' }}
      >
        <ArrowLeft size={18} /> Back to Classroom
      </button>

      <div style={{ backgroundColor: 'var(--color-paper-white)', padding: '40px', borderRadius: '24px', border: '2px solid var(--color-ink)', boxShadow: '8px 8px 0px var(--color-ink)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '16px', backgroundColor: '#fef3c7', borderRadius: '20px', border: '2px solid var(--color-ink)' }}>
              <FileText size={32} color="#d97706" />
            </div>
            <div>
              <h1 style={{ fontSize: '28px', color: 'var(--color-ink)', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '8px' }}>{assignment.title}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--color-fog)', fontSize: '14px', fontWeight: 600 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isLate ? '#991b1b' : 'var(--color-ink)' }}>
                  <Clock size={16} /> Due: {new Date(assignment.dueDate).toLocaleString()}
                </span>
                <span>•</span>
                <span>{assignment.maxMarks} Marks</span>
              </div>
            </div>
          </div>
        </div>

        {submitSuccess ? (
          <div style={{ padding: '40px', backgroundColor: '#dcfce7', borderRadius: '24px', border: '3px solid #166534', color: '#166534', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', textAlign: 'center', marginTop: '24px' }}>
            <CheckCircle size={64} />
            <div>
              <div style={{ fontWeight: 900, fontSize: '28px', marginBottom: '8px', letterSpacing: '-0.5px' }}>Assignment Submitted!</div>
              <div style={{ fontSize: '16px', fontWeight: 600, opacity: 0.8 }}>Your professor will grade it soon.</div>
            </div>
            <button 
              onClick={() => navigate(`/classrooms/${classroomId}`)}
              className="admin-btn-primary"
              style={{ marginTop: '8px', backgroundColor: '#166534', color: 'white', border: 'none', padding: '16px 32px', borderRadius: '16px', fontWeight: 800, cursor: 'pointer', fontSize: '16px', transition: 'all 0.2s' }}
            >
              Back to Classroom
            </button>
          </div>
        ) : (
          <>
            <div style={{ padding: '24px', backgroundColor: '#f8f9fa', borderRadius: '16px', border: '1px dashed var(--color-fog)', marginBottom: '40px' }}>
              <h3 style={{ fontSize: '15px', color: 'var(--color-ink)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Instructions</h3>
              <p style={{ color: 'var(--color-fog)', lineHeight: '1.6' }}>{assignment.description}</p>
            </div>

            {assignment.questions && assignment.questions.length > 0 ? (
              <div style={{ marginBottom: '40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '20px', color: 'var(--color-ink)', fontWeight: 800 }}>Assignment Questions</h2>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-fog)' }}>
                    Question {currentQuestionIndex + 1} of {assignment.questions.length}
                  </span>
                </div>
                
                {(() => {
                  const qIdx = currentQuestionIndex;
                  const q = assignment.questions[qIdx];
                  return (
                    <div key={qIdx} style={{ backgroundColor: 'var(--color-paper-white)', padding: '24px', borderRadius: '16px', border: '2px solid rgba(0,0,0,0.1)' }}>
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                        <span style={{ backgroundColor: 'var(--color-ink)', color: 'white', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>
                          {qIdx + 1}
                        </span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '16px', lineHeight: '1.5' }}>
                            {q.text}
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {q.options && q.options.map((opt, optIdx) => {
                              const isSelected = answers[qIdx] === optIdx;
                              return (
                                <div
                                  key={optIdx}
                                  onClick={() => handleOptionSelect(qIdx, optIdx)}
                                  style={{
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    border: `2px solid ${isSelected ? 'var(--color-ink)' : 'rgba(0,0,0,0.1)'}`,
                                    backgroundColor: isSelected ? 'rgba(15,15,18,0.05)' : 'white',
                                    cursor: submitSuccess ? 'default' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <div style={{
                                    width: '20px', height: '20px', borderRadius: '50%',
                                    border: `2px solid ${isSelected ? 'var(--color-ink)' : 'rgba(0,0,0,0.2)'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    backgroundColor: isSelected ? 'var(--color-ink)' : 'transparent'
                                  }}>
                                    {isSelected && <div style={{ width: '8px', height: '8px', backgroundColor: 'white', borderRadius: '50%' }} />}
                                  </div>
                                  <span style={{ fontSize: '15px', color: 'var(--color-ink)' }}>{opt}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-fog)', textTransform: 'uppercase' }}>
                          {q.marks} Marks
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <button 
                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestionIndex === 0}
                    className="admin-btn-secondary"
                    style={{ opacity: currentQuestionIndex === 0 ? 0.5 : 1, cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer', padding: '10px 24px' }}
                  >
                    Previous
                  </button>
                  {currentQuestionIndex < assignment.questions.length - 1 ? (
                    <button 
                      onClick={() => setCurrentQuestionIndex(prev => Math.min(assignment.questions.length - 1, prev + 1))}
                      className="admin-btn-primary"
                      style={{ padding: '10px 24px', backgroundColor: 'var(--color-ink)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer' }}
                    >
                      Next
                    </button>
                  ) : (
                    <button 
                      onClick={confirmSubmit}
                      disabled={submitting}
                      className="admin-btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '12px', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}
                    >
                      <Send size={16} />
                      {submitting ? 'Submitting...' : 'Submit Assignment'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: '20px', color: 'var(--color-ink)', fontWeight: 800, marginBottom: '16px' }}>Your Submission</h2>
                <form onSubmit={confirmSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {submitError && (
                    <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '12px', fontSize: '14px', fontWeight: 500, border: '1px solid #fca5a5' }}>
                      {submitError}
                    </div>
                  )}
                  
                  <textarea
                    className="admin-input"
                    rows={6}
                    placeholder="Type your answer or comments here..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                    style={{ resize: 'vertical' }}
                  />
                  
                  <button 
                    type="submit" 
                    disabled={submitting || !comment.trim()}
                    className="admin-btn-primary"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', fontSize: '16px', opacity: (!comment.trim() || submitting) ? 0.7 : 1, cursor: (!comment.trim() || submitting) ? 'not-allowed' : 'pointer' }}
                  >
                    <Send size={18} />
                    {submitting ? 'Submitting...' : 'Submit Assignment'}
                  </button>
                </form>
              </>
            )}
            
            {submitError && (!assignment.questions || assignment.questions.length > 0) && (
              <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '12px', fontSize: '14px', fontWeight: 500, border: '1px solid #fca5a5' }}>
                {submitError}
              </div>
            )}
          </>
        )}

      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 15, 18, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'var(--color-paper-white)', padding: '32px', borderRadius: '24px', border: '4px solid var(--color-ink)', boxShadow: '8px 8px 0px var(--color-ink)', maxWidth: '440px', width: '100%', animation: 'popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--color-ink)', marginBottom: '12px', letterSpacing: '-0.5px' }}>Submit Assignment?</h3>
            <p style={{ color: 'var(--color-fog)', fontSize: '16px', lineHeight: '1.5', marginBottom: '32px', fontWeight: 500 }}>
              Are you sure you want to submit? There will be no changes allowed after submission.
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="admin-btn-secondary"
                style={{ flex: 1, padding: '16px', textAlign: 'center', fontWeight: 800, fontSize: '16px' }}
              >
                Cancel
              </button>
              <button 
                onClick={executeSubmit}
                className="admin-btn-primary"
                style={{ flex: 1, padding: '16px', textAlign: 'center', backgroundColor: '#10b981', color: 'white', border: '3px solid var(--color-ink)', borderRadius: '16px', fontWeight: 800, fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Send size={18} /> Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

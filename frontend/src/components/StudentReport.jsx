'use client';

import { CheckCircle2, XCircle, MinusCircle, Award, FileText, MessageSquare } from 'lucide-react';
import styles from './StudentReport.module.css';
const format = value => Number.isFinite(value) ? Number(value.toFixed(2)) : 'Pending';
const date = value => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export default function StudentReport({ report, heading = 'Test Report' }) {
  const questions = report.questions || [];
  const graded = Number.isFinite(report.score);
  const percent = graded && report.maximumScore > 0 ? report.score / report.maximumScore * 100 : null;
  const correct = questions.filter(q => q.selectedOption != null && q.selectedOption === q.correctOptionIndex).length;
  const unanswered = questions.filter(q => q.selectedOption == null && !q.answerText).length;
  return <section className={styles.report}>
    <header className={styles.header}><div><p className={styles.eyebrow}>YOUR PERFORMANCE</p><h2>{heading}</h2></div><span className={`${styles.badge} ${graded ? styles.good : styles.pending}`}>{graded ? 'Graded' : 'Awaiting grade'}</span></header>
    {report.description && <p className={styles.description}>{report.description}</p>}
    <div className={styles.overview}>
      <div className={styles.scoreCard}><div className={styles.scoreLabel}><Award size={20} /> Total score</div><p className={styles.score} aria-label={`Score: ${format(report.score)} / ${format(report.maximumScore)}`}>{format(report.score)} <span>/ {format(report.maximumScore)}</span></p><div className={styles.track}><div style={{ width: `${Math.min(100, Math.max(0, percent || 0))}%` }} /></div><p className={styles.caption}>{percent == null ? 'Your result will appear once graded.' : `${format(percent)}% of available points`}</p></div>
      <div className={styles.summary}>
        {questions.length > 0 && <div className={styles.stats}><div><CheckCircle2 size={18} /><strong>{correct}</strong><span>Correct</span></div><div><XCircle size={18} /><strong>{questions.length-correct-unanswered}</strong><span>Incorrect</span></div><div><MinusCircle size={18} /><strong>{unanswered}</strong><span>Unanswered</span></div></div>}
        <dl className={styles.details}>{report.startedAt && <div><dt>Started</dt><dd>{date(report.startedAt)}</dd></div>}{report.completedAt && <div><dt>Submitted</dt><dd>{date(report.completedAt)}</dd></div>}{report.gradedAt && <div><dt>Graded</dt><dd>{date(report.gradedAt)}</dd></div>}{typeof report.isLate === 'boolean' && <div><dt>Submission status</dt><dd>{report.isLate ? 'Late submission' : 'On time'}</dd></div>}</dl>
      </div>
    </div>
    {(report.comment || report.fileUrl) && <section className={styles.note}><h3><FileText size={18} /> Your submission</h3>{report.comment && <p>{report.comment}</p>}{/^https?:\/\//i.test(report.fileUrl || '') && <a href={report.fileUrl} target="_blank" rel="noopener noreferrer">View submitted attachment ↗</a>}</section>}
    {report.feedback && <section className={`${styles.note} ${styles.feedback}`}><h3><MessageSquare size={18} /> Teacher feedback</h3><p>{report.feedback}</p></section>}
    {questions.length > 0 && <div className={styles.reviewHeading}><h3>Answer review</h3><span>{questions.length} questions</span></div>}
    {report.gradingNote && <p className={styles.gradingNote}>{report.gradingNote}</p>}
    <div className={styles.questions}>{questions.map((q,index) => {
      const skipped = q.selectedOption == null && !q.answerText;
      const right = q.selectedOption != null && q.selectedOption === q.correctOptionIndex;
      const Icon = skipped ? MinusCircle : right ? CheckCircle2 : XCircle;
      return <article key={q._id || index} className={styles.question}>
        <div className={styles.questionTop}><span className={styles.number}>QUESTION {String(index+1).padStart(2,'0')}</span><span className={`${styles.badge} ${skipped ? styles.pending : right ? styles.good : styles.bad}`}><Icon size={14} />{skipped ? 'Not answered' : right ? 'Correct' : 'Incorrect'}</span></div><h4>{q.text}</h4>
        <ol className={styles.options}>{(q.options || []).map((option,i) => {
          const chosen = i === q.selectedOption, answer = i === q.correctOptionIndex;
          return <li key={i} className={`${styles.option} ${answer ? styles.correctOption : chosen ? styles.wrongOption : ''}`}><span className={styles.letter}>{String.fromCharCode(65+i)}</span><span className={styles.optionText}>{option}</span>{(chosen || answer) && <span className={styles.optionTag}>{answer ? <CheckCircle2 size={15} /> : <XCircle size={15} />}{chosen && answer ? 'Your answer · Correct' : answer ? 'Correct answer' : 'Your answer'}</span>}</li>;
        })}</ol>
        {q.answerText && <p className={styles.written}>{q.answerText}</p>}
        {q.maximumPoints !== undefined && <footer className={styles.footer}>Points earned <strong>{format(q.pointsAwarded)} <span>/ {format(q.maximumPoints)}</span></strong></footer>}
      </article>;
    })}</div>
  </section>;
}

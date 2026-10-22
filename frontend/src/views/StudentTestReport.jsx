'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { testsAPI } from '@/services/api';
import StudentReport from '@/components/StudentReport';
import { ArrowLeft } from 'lucide-react';
import styles from '@/components/StudentReport.module.css';

export default function StudentTestReport() {
  const { testId } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    testsAPI.getMyReport(testId).then(res => { if (active) setReport(res.data); })
      .catch(err => { if (active) setError(err.message || 'Unable to load report'); });
    return () => { active = false; };
  }, [testId]);
  return <main className={styles.page}>
    <Link className={styles.back} href={report ? `/classrooms/${report.classroomId}` : '/classrooms'}><ArrowLeft size={16} />Back to Classroom</Link>
    {error ? <p className={styles.state} role="alert">{error}</p> : report ? <><h1 className={styles.title}>{report.title}</h1><StudentReport report={report} /></> : <p className={styles.state} role="status">Loading report...</p>}
  </main>;
}

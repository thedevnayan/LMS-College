'use client';
import Link from 'next/link';
export default function GuestAssessmentUnavailable() {
  return <div style={{ maxWidth: 600, margin: '60px auto', padding: 32 }}><h1>Student sign-in required</h1><p>SkillBery assessments are restricted to enrolled students. Sign in, then open the test from your classroom.</p><Link href="/login">Sign in</Link></div>;
}

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, GraduationCap, Clock, FileText } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { studentsAPI } from '../services/api';

export default function AdminStudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await studentsAPI.getProfile(id);
      if (res.success) {
        setProfileData(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch student profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-fog)' }}>Loading profile...</div>;
  }

  if (!profileData) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-ink)', marginBottom: '16px' }}>Student Not Found</h2>
        <button onClick={() => navigate('/admin/students')} style={{ padding: '12px 24px', backgroundColor: 'var(--color-sun-yellow)', border: '2px solid var(--color-ink)', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', boxShadow: '4px 4px 0px var(--color-ink)' }}>
          Back to Students
        </button>
      </div>
    );
  }

  const { student, chartData, totalAssignments, totalTests } = profileData;

  const averageScore = chartData.length > 0 
    ? (chartData.reduce((acc, curr) => acc + curr.percentage, 0) / chartData.length).toFixed(1) 
    : 0;

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Back Button */}
      <button 
        onClick={() => navigate('/admin/students')}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-fog)', fontWeight: 600, fontSize: '16px', marginBottom: '24px' }}
      >
        <ArrowLeft size={20} /> Back to Students
      </button>

      {/* Header Profile Card */}
      <div style={{ display: 'flex', gap: '32px', marginBottom: '32px', backgroundColor: 'var(--color-paper-white)', padding: '32px', borderRadius: '24px', border: '2px solid var(--color-ink)', boxShadow: '6px 6px 0px var(--color-ink)' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '20px', backgroundColor: 'var(--color-ink)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 800 }}>
          {student.name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-1px', marginBottom: '4px' }}>
            {student.name}
          </h1>
          <p style={{ color: 'var(--color-fog)', fontSize: '16px', fontWeight: 500 }}>
            {student.email}
          </p>
        </div>
        
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px' }}>
          <div style={{ backgroundColor: '#e0e7ff', padding: '16px 24px', borderRadius: '16px', border: '2px solid var(--color-ink)' }}>
            <div style={{ fontSize: '14px', color: 'var(--color-ink)', fontWeight: 700, marginBottom: '4px' }}>Average Score</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#4f46e5' }}>{averageScore}%</div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <div style={{ backgroundColor: '#fef3c7', padding: '24px', borderRadius: '20px', border: '2px solid var(--color-ink)', boxShadow: '4px 4px 0px var(--color-ink)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <FileText size={24} color="#d97706" />
            <h3 style={{ fontSize: '18px', color: 'var(--color-ink)', fontWeight: 700 }}>Assignments</h3>
          </div>
          <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--color-ink)' }}>{totalAssignments}</div>
          <div style={{ color: 'var(--color-fog)', fontSize: '14px', marginTop: '4px' }}>Submitted assignments</div>
        </div>

        <div style={{ backgroundColor: '#fee2e2', padding: '24px', borderRadius: '20px', border: '2px solid var(--color-ink)', boxShadow: '4px 4px 0px var(--color-ink)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <GraduationCap size={24} color="#dc2626" />
            <h3 style={{ fontSize: '18px', color: 'var(--color-ink)', fontWeight: 700 }}>Tests Attended</h3>
          </div>
          <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--color-ink)' }}>{totalTests}</div>
          <div style={{ color: 'var(--color-fog)', fontSize: '14px', marginTop: '4px' }}>Completed tests</div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Line Chart - Trend */}
        <div style={{ backgroundColor: 'var(--color-paper-white)', padding: '32px', borderRadius: '24px', border: '2px solid var(--color-ink)', boxShadow: '6px 6px 0px var(--color-ink)' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-ink)', marginBottom: '24px' }}>Performance Trend (%)</h3>
          {chartData.length > 0 ? (
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="dateString" tick={{ fill: 'var(--color-fog)', fontSize: 12 }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'var(--color-fog)', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--color-paper-white)', border: '2px solid var(--color-ink)', borderRadius: '12px', boxShadow: '4px 4px 0px var(--color-ink)' }}
                    itemStyle={{ color: 'var(--color-ink)', fontWeight: 700 }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="percentage" name="Score %" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 8, fill: '#ffde3b', stroke: 'var(--color-ink)', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-fog)', fontStyle: 'italic' }}>
              Not enough data to display trends.
            </div>
          )}
        </div>

        {/* Bar Chart - Absolute Scores vs Max Scores */}
        <div style={{ backgroundColor: 'var(--color-paper-white)', padding: '32px', borderRadius: '24px', border: '2px solid var(--color-ink)', boxShadow: '6px 6px 0px var(--color-ink)' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-ink)', marginBottom: '24px' }}>Scores by Assessment</h3>
          {chartData.length > 0 ? (
            <div style={{ width: '100%', height: '350px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: 'var(--color-fog)', fontSize: 12 }} tickLine={false} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fill: 'var(--color-fog)', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    contentStyle={{ backgroundColor: 'var(--color-paper-white)', border: '2px solid var(--color-ink)', borderRadius: '12px', boxShadow: '4px 4px 0px var(--color-ink)' }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="score" name="Marks Obtained" fill="#ffde3b" radius={[4, 4, 0, 0]} stroke="var(--color-ink)" strokeWidth={2} />
                  <Bar dataKey="maxScore" name="Max Marks" fill="#cbd5e1" radius={[4, 4, 0, 0]} stroke="var(--color-ink)" strokeWidth={2} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-fog)', fontStyle: 'italic' }}>
              No assessments found.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

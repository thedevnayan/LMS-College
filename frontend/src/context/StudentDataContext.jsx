'use client';

import React, { createContext, useContext } from 'react';

const StudentDataContext = createContext(null);

export function StudentDataProvider({ children, value }) {
  return <StudentDataContext.Provider value={value}>{children}</StudentDataContext.Provider>;
}

export function useStudentData() {
  const ctx = useContext(StudentDataContext);
  if (!ctx) {
    throw new Error('useStudentData must be used within a StudentDataProvider');
  }
  return ctx;
}

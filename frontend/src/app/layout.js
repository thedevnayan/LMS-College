import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'sonner';


export const metadata = {
  title: "SkillBery",
  description: 'Learning Management System for college students and professors',
  icons: {
    icon: '/favicon.svg',
  },
};

import { AcademicProvider } from '@/context/AcademicContext';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AcademicProvider>
            <Toaster position="top-right" richColors />
            {children}
          </AcademicProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

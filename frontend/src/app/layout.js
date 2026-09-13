import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata = {
  title: "LMS - Mamta Ma'am",
  description: 'Learning Management System for college students and professors',
  icons: {
    icon: '/favicon.svg',
  },
};

import { AcademicProvider } from '@/context/AcademicContext';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <AcademicProvider>
            {children}
          </AcademicProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

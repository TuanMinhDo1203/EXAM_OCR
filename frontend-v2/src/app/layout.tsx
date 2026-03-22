import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';

const outfit = Outfit({ 
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'EXAM_OCR V2.0',
  description: 'AI-Powered Exam Grading System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} font-sans`}>
      <body className="bg-slate-50 text-slate-900 antialiased selection:bg-indigo-500/30">
        {children}
      </body>
    </html>
  );
}

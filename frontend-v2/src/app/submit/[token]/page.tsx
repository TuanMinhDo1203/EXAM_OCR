'use client';

import React, { use } from 'react';
import Link from 'next/link';

export default function StudentLandingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  return (
    <div className="flex-1 flex flex-col p-6 items-center justify-center relative">
       <div className="absolute inset-0 bg-gradient-to-b from-indigo-50 to-white pointer-events-none"></div>
       
       <div className="relative z-10 w-full flex flex-col items-center">
          <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
             <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
             </svg>
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-900">Midterm 1: Calculus</h1>
          <p className="text-slate-500 mt-2 text-center text-sm font-medium">Token Session: {token.substring(0,8).toUpperCase()}</p>
          
          <div className="glass-panel hover-lift w-full p-5 mt-8 rounded-2xl space-y-4">
             <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Instructor</span>
                <span className="text-slate-900 font-bold">Prof. Alabaster</span>
             </div>
             <div className="border-t border-slate-100"></div>
             <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Exam format</span>
                <span className="text-indigo-600 font-bold bg-indigo-50 px-3 py-1 rounded-lg">Paper scan</span>
             </div>
          </div>
          
          <div className="mt-12 w-full space-y-4">
             <Link href={`/submit/${token}/capture`} className="w-full flex items-center justify-center py-4 rounded-xl font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all hover:-translate-y-1">
                 Authenticate & Continue
             </Link>
             <p className="text-xs text-center text-slate-400 font-medium px-4">
                 By continuing, you agree to Alabaster Academy's academic integrity policy.
             </p>
          </div>
       </div>
    </div>
  );
}

'use client';

import React, { use } from 'react';
import Link from 'next/link';

export default function ConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  return (
    <div className="flex-1 flex flex-col p-6 items-center justify-center relative bg-slate-50">
       <div className="w-full flex justify-between items-center mb-6">
           <h2 className="text-xl font-bold text-slate-800">Review Scan</h2>
           <span className="text-sm font-medium text-slate-500">1/1</span>
       </div>

       {/* Image Preview Container */}
       <div className="flex-1 w-full bg-slate-200 rounded-2xl border border-slate-300 shadow-inner flex items-center justify-center overflow-hidden mb-6 group relative">
           <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
           {/* Mockup image */}
           <div className="w-3/4 h-3/4 bg-white shadow-xl rotate-1 border border-slate-300 p-4">
               <div className="w-full h-full border-2 border-indigo-200 border-dashed rounded flex flex-col items-center justify-center opacity-50 bg-indigo-50/20">
                   <p className="text-xs font-mono font-bold text-indigo-400">MATH_101_EXAM_SCAN.PNG</p>
               </div>
           </div>
       </div>

       <div className="w-full space-y-4">
           {/* Retake */}
           <Link href={`/submit/${token}/capture`} className="w-full py-4 bg-white border border-slate-300 hover:border-indigo-400 text-slate-700 font-bold rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2">
               <span>Need to Retake?</span>
           </Link>
           {/* Confirm Upload */}
           <Link href={`/submit/${token}/success`} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl shadow-[0_5px_shadow-indigo-500/30] transition-all flex items-center justify-center gap-2">
               <span>Looks Good, Upload</span>
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
               </svg>
           </Link>
       </div>
    </div>
  );
}

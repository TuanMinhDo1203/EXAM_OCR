'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import type { SubmitUploadResponse } from '@/lib/api/submit';

export default function SuccessPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [result, setResult] = useState<SubmitUploadResponse | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(`submit-response:${token}`);
    if (raw) {
      setResult(JSON.parse(raw));
    }
  }, [token]);

  return (
    <div className="flex-1 flex flex-col p-6 items-center justify-center bg-indigo-600 text-white relative overflow-hidden">
       {/* decorative background circles */}
       <div className="absolute top-[-10%] left-[-20%] w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-50"></div>
       <div className="absolute bottom-[-10%] right-[-20%] w-64 h-64 bg-violet-500 rounded-full blur-3xl opacity-50"></div>

       <div className="z-10 flex flex-col items-center w-full max-w-sm animate-in zoom-in duration-500 fade-in">
           <div className="w-24 h-24 bg-white text-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/20">
               <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
               </svg>
           </div>
           <h1 className="text-3xl font-extrabold tracking-tight mb-2">Upload Complete!</h1>
           <p className="text-indigo-100 text-center mb-8 font-medium">
               Bài làm đã được ghi nhận. Hệ thống sẽ OCR và chấm điểm ngầm để giáo viên xem xét sau.
           </p>

           <div className="bg-indigo-700/50 w-full p-6 rounded-2xl backdrop-blur-md border border-indigo-400/30 mb-8">
               <div className="flex justify-between items-center text-sm font-medium mb-3">
                   <span className="text-indigo-200">Confirmation Code</span>
                   <span className="text-white bg-indigo-800 px-3 py-1 rounded">
                     {result?.submission_id?.slice(0, 8).toUpperCase() || 'PENDING'}
                   </span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium">
                   <span className="text-indigo-200">Upload Time</span>
                   <span className="text-white font-bold">
                     {result ? `${result.processing_time.toFixed(1)}s` : '~ 2 Mins'}
                   </span>
                </div>
           </div>

           <Link href={`/submit/${token}/grade`} className="w-full bg-white text-indigo-700 font-bold py-4 rounded-xl shadow-xl hover:bg-slate-50 transition-colors text-center">
               Open Submission Status
           </Link>
           <p className="mt-6 text-sm text-indigo-300 font-medium">You can safely close this window.</p>
       </div>
    </div>
  );
}

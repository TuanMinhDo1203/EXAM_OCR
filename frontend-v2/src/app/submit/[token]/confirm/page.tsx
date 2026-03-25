'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { uploadSubmission } from '@/lib/api/submit';

export default function ConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [imageDataUrl, setImageDataUrl] = useState<string>('');
  const [studentEmail, setStudentEmail] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setImageDataUrl(sessionStorage.getItem(`submit-image:${token}`) || '');
    setStudentEmail(sessionStorage.getItem(`submit-email:${token}`) || '');
  }, [token]);

  async function handleUpload() {
    if (!imageDataUrl) {
      setError('No image selected yet. Please retake the scan.');
      return;
    }
    if (!studentEmail) {
      setError('Student email is missing. Please return to the start page.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await uploadSubmission(token, imageDataUrl, studentEmail);
      sessionStorage.setItem(`submit-response:${token}`, JSON.stringify(response));
      router.push(`/submit/${token}/success`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col p-6 items-center justify-center relative bg-slate-50">
       <div className="w-full flex justify-between items-center mb-6">
           <h2 className="text-xl font-bold text-slate-800">Review Scan</h2>
           <span className="text-sm font-medium text-slate-500">1/1</span>
       </div>

       {/* Image Preview Container */}
       <div className="flex-1 w-full bg-slate-200 rounded-2xl border border-slate-300 shadow-inner flex items-center justify-center overflow-hidden mb-6 group relative">
           <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
           {imageDataUrl ? (
             <img src={imageDataUrl} alt="Submission preview" className="max-h-full max-w-full object-contain" />
           ) : (
             <div className="w-3/4 h-3/4 bg-white shadow-xl rotate-1 border border-slate-300 p-4">
                 <div className="w-full h-full border-2 border-indigo-200 border-dashed rounded flex flex-col items-center justify-center opacity-50 bg-indigo-50/20">
                     <p className="text-xs font-mono font-bold text-indigo-400">No image selected</p>
                 </div>
             </div>
           )}
       </div>
       {error && (
         <div className="mb-4 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
           {error}
         </div>
       )}
       {submitting && (
         <div className="mb-4 w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
           Đang gửi bài lên hệ thống. OCR và chấm điểm sẽ chạy ngầm sau khi nộp xong.
         </div>
       )}
       {studentEmail && (
         <div className="mb-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
           Nộp bài với email: <span className="font-semibold">{studentEmail}</span>
         </div>
       )}

       <div className="w-full space-y-4">
           {/* Retake */}
           <Link href={`/submit/${token}/capture`} className="w-full py-4 bg-white border border-slate-300 hover:border-indigo-400 text-slate-700 font-bold rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2">
               <span>Need to Retake?</span>
           </Link>
           {/* Confirm Upload */}
           <button
             type="button"
             onClick={handleUpload}
             disabled={submitting}
             className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70"
           >
               <span>{submitting ? 'Đang nộp bài...' : 'Looks Good, Upload'}</span>
               {submitting ? (
                 <span className="material-symbols-outlined animate-spin" style={{ fontSize: '20px' }}>
                   progress_activity
                 </span>
               ) : (
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                 </svg>
               )}
           </button>
       </div>
    </div>
  );
}

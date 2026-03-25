'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import type { SubmitUploadResponse } from '@/lib/api/submit';

export default function GradePortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [result, setResult] = useState<SubmitUploadResponse | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(`submit-response:${token}`);
    if (raw) {
      setResult(JSON.parse(raw));
    }
  }, [token]);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden">
      <div className="bg-indigo-600 text-white p-6 pb-12 rounded-b-[2.5rem] shadow-md z-10 relative">
        <div className="flex justify-between items-center mb-8">
          <span className="text-sm font-bold opacity-80 uppercase tracking-widest">Submission Status</span>
          <span className="bg-white/20 px-3 py-1 text-xs rounded-full backdrop-blur-sm font-medium">Pending Review</span>
        </div>

        <h1 className="text-2xl font-bold mb-1">Bài làm đã được tiếp nhận</h1>
        <p className="opacity-80 text-sm font-medium">
          Hệ thống đang OCR và giáo viên sẽ xem lại trước khi công bố điểm.
        </p>
      </div>

      <div className="px-6 relative z-20 -mt-6">
        <div className="bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-4">
          <div>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-wider mb-1">Submission Code</p>
            <div className="text-2xl font-extrabold text-slate-900">
              {result?.submission_id?.slice(0, 8).toUpperCase() || 'PENDING'}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-slate-500 font-medium mb-1">Upload status</div>
              <div className="font-bold text-slate-900">{result?.status || 'uploaded'}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-slate-500 font-medium mb-1">Pages received</div>
              <div className="font-bold text-slate-900">{result?.pages_created ?? 1}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 pt-8 pb-12">
        <div className="glass-panel p-5 rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-900 border-l-4 border-indigo-500 pl-3">Current State</h3>
            <span className="text-amber-700 font-bold bg-amber-50 px-3 py-1 rounded text-sm">Teacher Review Required</span>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 whitespace-pre-line border border-slate-100 leading-relaxed">
            Điểm số chưa được hiển thị cho học sinh tại thời điểm này. Giáo viên sẽ xem lại OCR, chấm điểm AI và duyệt kết quả trước khi công bố.
          </div>
        </div>

        <div className="text-center">
          <Link href={`/submit/${token}`} className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100">
            Quay lại trang nộp bài
          </Link>
        </div>
      </div>
    </div>
  );
}

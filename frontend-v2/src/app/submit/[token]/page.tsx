'use client';

import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchSubmitExamInfo, SubmitExamInfo, validateSubmitStudent } from '@/lib/api/submit';
import { ApiError } from '@/lib/api/client';

export default function StudentLandingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [examInfo, setExamInfo] = useState<SubmitExamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentEmail, setStudentEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const result = await fetchSubmitExamInfo(token);
        setExamInfo(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  useEffect(() => {
    setStudentEmail(sessionStorage.getItem(`submit-email:${token}`) || '');
  }, [token]);

  async function handleContinue() {
    const normalized = studentEmail.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
      setError('Vui lòng nhập email hợp lệ trước khi tiếp tục.');
      return;
    }
    setIsValidating(true);
    setError(null);
    try {
      const result = await validateSubmitStudent(token, normalized);
      sessionStorage.setItem(`submit-email:${token}`, result.student_email);
      router.push(`/submit/${token}/capture`);
    } catch (err) {
      console.error(err);
      if (err instanceof ApiError) {
        const message = err.message.toLowerCase();
        if (message.includes('not an active member of this class')) {
          setError('Sinh viên không có trong lớp của bài kiểm tra này.');
        } else if (message.includes('student email is not registered')) {
          setError('Email này chưa tồn tại trong hệ thống.');
        } else if (message.includes('email does not belong to a student')) {
          setError('Email này không thuộc tài khoản học sinh.');
        } else if (message.includes('exam token not found')) {
          setError('Không tìm thấy bài kiểm tra tương ứng với mã QR này.');
        } else if (message.includes('exam is not accepting submissions')) {
          setError('Bài kiểm tra này hiện không nhận bài nộp.');
        } else {
          setError('Không thể xác thực email học sinh cho lớp này.');
        }
      } else {
        setError('Không thể xác thực email học sinh cho lớp này.');
      }
    } finally {
      setIsValidating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#4849da' }}>progress_activity</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 items-center justify-center relative">
       <div className="absolute inset-0 bg-gradient-to-b from-indigo-50 to-white pointer-events-none"></div>
       
       <div className="relative z-10 w-full flex flex-col items-center">
          <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
             <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
             </svg>
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-900">
            {examInfo?.exam_title || 'Exam Session'}
          </h1>
          <p className="text-slate-500 mt-2 text-center text-sm font-medium">Token Session: {token.substring(0,8).toUpperCase()}</p>
          
          <div className="glass-panel hover-lift w-full p-5 mt-8 rounded-2xl space-y-4">
             <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Instructor</span>
                <span className="text-slate-900 font-bold">{examInfo?.class_name || 'Class Session'}</span>
             </div>
             <div className="border-t border-slate-100"></div>
             <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Exam format</span>
                <span className="text-indigo-600 font-bold bg-indigo-50 px-3 py-1 rounded-lg">
                  {examInfo?.subject || 'Paper scan'}
                </span>
             </div>
             <div className="border-t border-slate-100"></div>
             <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Time limit</span>
                <span className="text-slate-900 font-bold">{examInfo?.time_limit_minutes ?? '--'} mins</span>
             </div>
          </div>

          <div className="mt-8 w-full space-y-3">
             <label className="block text-sm font-semibold text-slate-700">Email học sinh</label>
             <input
               type="email"
               value={studentEmail}
               onChange={(e) => {
                 setStudentEmail(e.target.value);
                 setError(null);
               }}
               placeholder="student@example.com"
               className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
             />
             {error && (
               <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                 {error}
               </div>
             )}
             <p className="text-xs text-slate-500">
               Email này phải thuộc danh sách học sinh đã được thêm vào lớp của exam batch.
             </p>
          </div>
          
          <div className="mt-12 w-full space-y-4">
             <button
               type="button"
               onClick={handleContinue}
               disabled={isValidating}
               className="w-full flex items-center justify-center py-4 rounded-xl font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all hover:-translate-y-1"
             >
                 {isValidating ? 'Đang kiểm tra email...' : 'Continue to Upload'}
             </button>
             <p className="text-xs text-center text-slate-400 font-medium px-4">
                 By continuing, you agree to Alabaster Academy's academic integrity policy.
             </p>
          </div>
       </div>
    </div>
  );
}

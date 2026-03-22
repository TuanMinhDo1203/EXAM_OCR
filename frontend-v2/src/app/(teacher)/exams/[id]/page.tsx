'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { fetchExamDetail, ExamDetail } from '@/lib/api/exams';

export default function BatchDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [examDetail, setExamDetail] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchExamDetail(id);
        setExamDetail(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div className="p-8 text-gray-400">Loading batch details...</div>;
  if (!examDetail) return <div className="p-8 text-red-500">Exam not found</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="flex justify-between items-start bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{examDetail.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{examDetail.subject} • Token: {examDetail.qr_token}</p>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">
            Export CSV
          </button>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm">
            Finalize Batch
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase">Total Students</p>
          <p className="text-2xl font-bold mt-1">{examDetail.total_expected}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase">Submitted</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{examDetail.total_submissions}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase">Avg Score</p>
          <p className="text-2xl font-bold mt-1">{examDetail.avg_score}%</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase">Avg Confidence</p>
          <p className="text-2xl font-bold mt-1">{Math.round(examDetail.avg_confidence * 100)}%</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm">
              <th className="px-6 py-4 font-medium">Student</th>
              <th className="px-6 py-4 font-medium">Scanned Pages</th>
              <th className="px-6 py-4 font-medium">OCR Status</th>
              <th className="px-6 py-4 font-medium">Score</th>
              <th className="px-6 py-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {examDetail.submissions?.map((sub) => (
              <tr key={sub.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <img src={sub.student.avatar_url} alt="" className="w-8 h-8 rounded-full bg-gray-200" />
                    <span className="font-medium text-gray-900">{sub.student.display_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">{sub.scanned_pages} pages</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                    ${sub.ocr_status === 'verified' ? 'bg-green-100 text-green-700' : 
                      sub.ocr_status === 'attention' ? 'bg-orange-100 text-orange-700' : 
                      'bg-gray-100 text-gray-700'}`
                  }>
                    {sub.ocr_status}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium text-gray-900">
                  {sub.score !== null ? `${sub.score}/${sub.max_score}` : '-'}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link 
                    href={`/review/${sub.id}`} 
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                  >
                    Review →
                  </Link>
                </td>
              </tr>
            ))}
            {(!examDetail.submissions || examDetail.submissions.length === 0) && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No submissions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

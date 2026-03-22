/* eslint-disable @next/next/no-img-element */
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

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#4849da', animation: 'spin 1s linear infinite' }}>progress_activity</span>
    </div>
  );
  if (!examDetail) return <div className="p-8" style={{ color: '#a54731' }}>Exam not found</div>;

  const confidencePct = Math.round(examDetail.avg_confidence * 100);
  const flaggedCount = examDetail.submissions?.filter((s: any) => s.ocr_status === 'attention').length ?? 0;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10">
      
      {/* Header */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest mb-2 block" style={{ color: '#4849da' }}>
              Batch Details
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: '#38382f' }}>
              {examDetail.title}
            </h1>
            <p className="text-sm mt-1" style={{ color: '#65655b' }}>
              {examDetail.subject} • Token: {examDetail.qr_token} • Created: {new Date(examDetail.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              className="px-6 py-3 font-bold text-sm rounded-full neumorphic-lift hover:opacity-80 transition-all active:scale-95 flex items-center space-x-2"
              style={{ background: '#f0eee3', color: '#38382f' }}
            >
              <span className="material-symbols-outlined text-lg">download</span>
              <span>Export CSV</span>
            </button>
            <button
              className="px-6 py-3 font-bold text-sm rounded-full shadow-lg hover:brightness-110 transition-all active:scale-95 flex items-center space-x-2"
              style={{ background: 'linear-gradient(135deg, #4849da, #3b3bce)', color: '#faf6ff' }}
            >
              <span className="material-symbols-outlined text-lg">add_task</span>
              <span>Finalize Batch</span>
            </button>
          </div>
        </div>

        {/* Metrics Bento */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              icon: 'description', iconColor: '#4849da', iconBg: 'rgba(225,224,255,0.3)',
              badge: '+12%', badgeBg: '#caebcd', badgeColor: '#3c5842',
              label: 'Total Scanned', value: examDetail.total_submissions,
              sub: 'Papers processed',
            },
            {
              icon: 'verified', iconColor: '#4e6b53', iconBg: 'rgba(202,235,205,0.3)',
              badge: null,
              label: 'OCR Accuracy', value: `${confidencePct}%`,
              sub: 'High precision', valueColor: '#4e6b53',
            },
            {
              icon: 'flag', iconColor: '#a54731', iconBg: 'rgba(254,139,112,0.2)',
              badge: 'Requires Action', badgeBg: '#fe8b70', badgeColor: '#742410',
              label: 'Flags Found', value: flaggedCount.toString().padStart(2, '0'),
              sub: 'Manual checks', valueColor: '#a54731',
            },
            {
              icon: 'analytics', iconColor: '#875b2d', iconBg: 'rgba(254,195,140,0.3)',
              badge: null,
              label: 'Avg. Score', value: examDetail.avg_score || '--',
              sub: 'Mean performance',
            },
          ].map((m, i) => (
            <div key={i} className="p-6 rounded-2xl neumorphic-lift" style={{ background: '#f6f4ea', borderTop: '1px solid rgba(255,255,255,0.4)' }}>
              <div className="flex items-center justify-between mb-4">
                <span
                  className="material-symbols-outlined p-2 rounded-xl"
                  style={{ color: m.iconColor, background: m.iconBg, fontSize: '20px' }}
                >
                  {m.icon}
                </span>
                {m.badge && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                    style={{ background: m.badgeBg, color: m.badgeColor }}>
                    {m.badge}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold opacity-70" style={{ color: '#65655b' }}>{m.label}</p>
                <h3 className="text-3xl font-extrabold tracking-tight"
                  style={{ color: m.valueColor ?? '#38382f' }}>{m.value}</h3>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#65655b' }}>{m.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Student Submissions Table */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight" style={{ color: '#38382f' }}>Student Submissions</h2>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                className="w-56 pl-10 pr-4 py-2 text-sm rounded-full neumorphic-pressed outline-none"
                placeholder="Search Student..."
                type="text"
                style={{ background: '#fcf9f1', color: '#38382f', border: 'none' }}
              />
              <span className="material-symbols-outlined absolute left-3 top-2.5" style={{ fontSize: '18px', color: '#65655b' }}>search</span>
            </div>
            <button className="p-2 rounded-full neumorphic-lift active:scale-95 transition-all" style={{ color: '#65655b' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>filter_list</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto pb-8">
          <table className="w-full border-separate" style={{ borderSpacing: '0 12px' }}>
            <thead>
              <tr className="text-left text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: 'rgba(101,101,91,0.6)' }}>
                <th className="px-6 py-2">Student</th>
                <th className="px-6 py-2">Scanned Pages</th>
                <th className="px-6 py-2">OCR Status</th>
                <th className="px-6 py-2">AI Feedback</th>
                <th className="px-6 py-2 text-center">Score</th>
                <th className="px-6 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {examDetail.submissions?.map((sub: any) => {
                const initials = sub.student.display_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
                const isVerified = sub.ocr_status === 'verified';
                const isAttention = sub.ocr_status === 'attention';
                return (
                  <tr key={sub.id}
                    className="neumorphic-hover cursor-pointer"
                    style={{ background: 'rgba(252,249,241,0.5)' }}>
                    <td className="px-6 py-5 rounded-l-2xl">
                      <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs"
                          style={{ background: '#e1e0ff', color: '#3b3acd' }}>
                          {initials}
                        </div>
                        <span className="font-bold text-sm tracking-tight" style={{ color: '#38382f' }}>
                          {sub.student.display_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center space-x-1">
                        <span className="material-symbols-outlined text-sm" style={{ color: '#65655b', fontSize: '16px' }}>auto_stories</span>
                        <span className="text-sm font-medium">{sub.scanned_pages} Pages</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className="flex items-center space-x-2 text-[10px] font-black uppercase px-3 py-1 rounded-full w-fit"
                        style={{
                          background: isVerified ? 'rgba(202,235,205,0.4)' : isAttention ? 'rgba(254,139,112,0.2)' : 'rgba(254,195,140,0.4)',
                          color: isVerified ? '#4e6b53' : isAttention ? '#a54731' : '#875b2d',
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full"
                          style={{ background: isVerified ? '#4e6b53' : isAttention ? '#a54731' : '#875b2d' }} />
                        <span>{sub.ocr_status.charAt(0).toUpperCase() + sub.ocr_status.slice(1)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-sm font-medium italic" style={{ color: 'rgba(101,101,91,0.8)' }}>
                        {sub.ai_feedback}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      {sub.score !== null ? (
                        <>
                          <span className="font-bold text-lg" style={{ color: '#4e6b53' }}>{sub.score}</span>
                          <span className="text-[10px] font-bold opacity-50" style={{ color: '#65655b' }}>/{sub.max_score}</span>
                        </>
                      ) : (
                        <span className="font-bold text-lg" style={{ color: '#65655b' }}>--</span>
                      )}
                    </td>
                    <td className="px-6 py-5 rounded-r-2xl text-right">
                      {isAttention ? (
                        <Link
                          href={`/review/${sub.id}`}
                          className="px-4 py-2 font-bold text-xs rounded-full shadow-md transition-all active:scale-95"
                          style={{ background: '#a54731', color: '#ffffff' }}
                        >
                          Resolve OCR
                        </Link>
                      ) : (
                        <Link
                          href={`/review/${sub.id}`}
                          className="px-4 py-2 font-bold text-xs rounded-full neumorphic-lift transition-all hover:bg-primary hover:text-white active:scale-95"
                          style={{ background: '#F2EFE9', color: '#4849da' }}
                        >
                          Review Paper
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(!examDetail.submissions || examDetail.submissions.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center" style={{ color: '#65655b' }}>
                    No submissions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

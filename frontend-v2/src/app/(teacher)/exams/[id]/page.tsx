/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { deleteSubmission, exportExamCsv, fetchExamDetail, finalizeExam, ExamDetail } from '@/lib/api/exams';

export default function BatchDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [examDetail, setExamDetail] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; studentName: string } | null>(null);
  const [deletingSubmissionId, setDeletingSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(isInitial = false) {
      try {
        if (isInitial) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }
        const data = await fetchExamDetail(id);
        if (cancelled) return;
        setExamDetail(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    load(true);
    const intervalId = window.setInterval(() => {
      load(false);
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [id]);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#4849da', animation: 'spin 1s linear infinite' }}>progress_activity</span>
    </div>
  );
  if (!examDetail) return <div className="p-8" style={{ color: '#a54731' }}>Exam not found</div>;
  const currentExam = examDetail;
  const submitUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/submit/${examDetail.qr_token}`
    : `/submit/${examDetail.qr_token}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(submitUrl)}`;

  const confidencePct = Math.round(currentExam.avg_confidence * 100);
  const flaggedCount = currentExam.submissions?.filter((s: any) => s.ocr_status === 'attention').length ?? 0;

  async function handleExportCsv() {
    setExporting(true);
    try {
      await exportExamCsv(currentExam.id, currentExam.qr_token);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  }

  async function handleFinalizeBatch() {
    if (currentExam.status === 'finalized') return;
    const confirmed = window.confirm('Finalize this batch? Students will no longer be able to submit.');
    if (!confirmed) return;

    setFinalizing(true);
    try {
      const updated = await finalizeExam(currentExam.id);
      setExamDetail((current) => (current ? { ...current, ...updated } : current));
    } catch (err) {
      console.error(err);
    } finally {
      setFinalizing(false);
    }
  }

  async function handleDeleteSubmission() {
    if (!confirmDelete) return;
    setDeletingSubmissionId(confirmDelete.id);
    try {
      await deleteSubmission(currentExam.id, confirmDelete.id);
      setExamDetail((current) => {
        if (!current) return current;
        const nextSubmissions = (current.submissions || []).filter((item: any) => item.id !== confirmDelete.id);
        return {
          ...current,
          submissions: nextSubmissions,
          total_submissions: nextSubmissions.length,
        };
      });
      setConfirmDelete(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingSubmissionId(null);
    }
  }

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
            <p className="text-xs mt-2" style={{ color: '#818176' }}>
              {refreshing ? 'Refreshing submissions...' : 'Submission status auto-refreshes every 5 seconds.'}
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={exporting}
              className="px-6 py-3 font-bold text-sm rounded-full neumorphic-lift hover:opacity-80 transition-all active:scale-95 flex items-center space-x-2"
              style={{ background: '#f0eee3', color: '#38382f' }}
            >
              <span className="material-symbols-outlined text-lg">download</span>
              <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
            <button
              type="button"
              onClick={handleFinalizeBatch}
              disabled={finalizing || examDetail.status === 'finalized'}
              className="px-6 py-3 font-bold text-sm rounded-full shadow-lg hover:brightness-110 transition-all active:scale-95 flex items-center space-x-2"
              style={{
                background: examDetail.status === 'finalized'
                  ? '#94a3b8'
                  : 'linear-gradient(135deg, #4849da, #3b3bce)',
                color: '#faf6ff',
              }}
            >
              <span className="material-symbols-outlined text-lg">add_task</span>
              <span>
                {examDetail.status === 'finalized'
                  ? 'Batch Finalized'
                  : finalizing
                    ? 'Finalizing...'
                    : 'Finalize Batch'}
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="p-6 rounded-2xl neumorphic-lift" style={{ background: '#f6f4ea', borderTop: '1px solid rgba(255,255,255,0.4)' }}>
            <span className="text-[10px] font-black uppercase tracking-widest mb-2 block" style={{ color: '#4849da' }}>
              Submission Access
            </span>
            <h2 className="text-xl font-extrabold tracking-tight mb-2" style={{ color: '#38382f' }}>
              QR Token: {examDetail.qr_token}
            </h2>
            <p className="text-sm mb-4" style={{ color: '#65655b' }}>
              Học sinh quét QR hoặc mở link submit để nộp bài vào đúng exam batch này.
            </p>
            <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{ background: '#fcf9f1', color: '#38382f' }}>
              {submitUrl}
            </div>
          </div>

          <div className="p-6 rounded-2xl neumorphic-lift flex flex-col items-center justify-center gap-4" style={{ background: '#f6f4ea', borderTop: '1px solid rgba(255,255,255,0.4)' }}>
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#65655b' }}>
              QR Code
            </span>
            {qrImageUrl ? (
              <img
                src={qrImageUrl}
                alt={`QR for ${examDetail.title}`}
                className="w-48 h-48 rounded-2xl border border-slate-200 bg-white p-3"
              />
            ) : (
              <div className="w-48 h-48 rounded-2xl border border-dashed border-slate-300 flex items-center justify-center text-sm" style={{ color: '#65655b' }}>
                QR unavailable
              </div>
            )}
            <Link
              href={`/submit/${examDetail.qr_token}`}
              target="_blank"
              className="px-4 py-2 font-bold text-xs rounded-full neumorphic-lift transition-all hover:bg-primary hover:text-white active:scale-95"
              style={{ background: '#F2EFE9', color: '#4849da' }}
            >
              Open Submit Page
            </Link>
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
          <div>
            <h2 className="text-xl font-bold tracking-tight" style={{ color: '#38382f' }}>Student Submissions</h2>
            <p className="text-sm mt-1" style={{ color: '#65655b' }}>
              {examDetail.total_submissions} / {examDetail.total_expected} students submitted
            </p>
          </div>
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
                <th className="px-4 py-2 text-right">Delete</th>
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
                    <td className="px-6 py-5 text-right">
                      <Link
                        href={`/review/${sub.id}`}
                        className="px-4 py-2 font-bold text-xs rounded-full transition-all active:scale-95"
                        style={{
                          background: isAttention ? '#a54731' : '#F2EFE9',
                          color: isAttention ? '#ffffff' : '#4849da',
                          boxShadow: isAttention ? '0 8px 18px rgba(165,71,49,0.18)' : 'none',
                        }}
                      >
                        Review
                      </Link>
                    </td>
                    <td className="px-4 py-5 rounded-r-2xl text-right">
                      <button
                        type="button"
                        onClick={() => setConfirmDelete({ id: sub.id, studentName: sub.student.display_name })}
                        aria-label={`Delete submission for ${sub.student.display_name}`}
                        title="Xóa submission"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-95"
                        style={{
                          background: 'rgba(165,71,49,0.12)',
                          color: '#a54731',
                          border: '1px solid rgba(165,71,49,0.16)',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {(!examDetail.submissions || examDetail.submissions.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center" style={{ color: '#65655b' }}>
                    No submissions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div
            className="w-full max-w-md rounded-3xl p-6 shadow-2xl"
            style={{ background: '#fcf9f1', border: '1px solid rgba(187,186,174,0.25)' }}
          >
            <div className="mb-4 flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl"
                style={{ background: 'rgba(165,71,49,0.12)', color: '#a54731' }}
              >
                <span className="material-symbols-outlined">delete</span>
              </div>
              <div>
                <h3 className="text-lg font-extrabold tracking-tight" style={{ color: '#38382f' }}>
                  Xóa submission
                </h3>
                <p className="text-sm" style={{ color: '#65655b' }}>
                  Bài nộp của <strong>{confirmDelete.studentName}</strong> sẽ bị xóa khỏi exam này.
                </p>
              </div>
            </div>

            <div
              className="rounded-2xl px-4 py-3 text-sm"
              style={{ background: 'rgba(165,71,49,0.08)', color: '#7a3423' }}
            >
              Hành động này sẽ xóa trang scan, kết quả OCR và điểm liên quan của submission này.
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                disabled={deletingSubmissionId === confirmDelete.id}
                className="px-5 py-2.5 font-bold text-sm rounded-full"
                style={{ color: '#65655b', background: '#f0eee3' }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmission}
                disabled={deletingSubmissionId === confirmDelete.id}
                className="px-5 py-2.5 font-bold text-sm rounded-full"
                style={{ background: '#a54731', color: '#fff7f2' }}
              >
                {deletingSubmissionId === confirmDelete.id ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { fetchSubmissionGrade } from '@/lib/api/grades';
import { SubmissionGradeDetail } from '@/types/grade_detail';

export default function ResolutionDeskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<SubmissionGradeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [overrideScore, setOverrideScore] = useState<number>(0);

  useEffect(() => {
    async function load() {
      try {
        const result = await fetchSubmissionGrade(id);
        setData(result);
        setOverrideScore(result.grades?.[0]?.ai_score ?? 0);
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
      <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#4849da' }}>progress_activity</span>
    </div>
  );
  if (!data) return (
    <div className="p-10" style={{ color: '#a54731' }}>Không tìm thấy bài nộp.</div>
  );

  const currentGrade = data.grades?.[0];
  const currentPage = data.pages?.[0];
  const sub = data.submission;
  const confidencePct = currentPage ? Math.round(currentPage.ocr_confidence * 100) : 0;
  const agentConfPct = currentGrade ? Math.round(currentGrade.ai_confidence * 100) : 0;
  const isVerified = sub.ocr_status === 'verified';

  return (
    /* Full-bleed layout */
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
      
      {/* ── Header bar ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-8 py-4"
        style={{ background: 'rgba(242,239,233,0.9)', borderBottom: '1px solid rgba(187,186,174,0.2)' }}>
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] block mb-0.5" style={{ color: '#4849da' }}>
            Resolution Desk
          </span>
          <h1 className="text-lg font-extrabold tracking-tight" style={{ color: '#38382f' }}>
            Xác minh điểm: {sub.student.display_name}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: '#65655b' }}>Batch ID</p>
            <p className="text-sm font-bold" style={{ color: '#38382f' }}>{sub.exam_batch_id}</p>
          </div>
          <Link href={`/exams/${sub.exam_batch_id}`}
            className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold neumorphic-lift transition-all hover:scale-105 active:scale-95"
            style={{ color: '#4849da', background: '#F2EFE9' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
            Về Batch
          </Link>
        </div>
      </div>

      {/* ── Main workspace ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: Scan viewer ── */}
        <div className="flex flex-col flex-1 gap-3 p-6" style={{ borderRight: '1px solid rgba(187,186,174,0.15)' }}>
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: '#38382f' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#4849da' }}>center_focus_weak</span>
              Bản Scan Gốc
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: '#eae9dc', color: '#65655b' }}>RAW DATA</span>
          </div>

          {/* Sunken scan area with dot grid */}
          <div className="flex-1 neumorphic-pressed rounded-2xl relative overflow-hidden flex items-center justify-center"
            style={{ background: '#e4e3d4', minHeight: '0' }}>
            {/* Dot grid bg */}
            <div className="absolute inset-0 pointer-events-none opacity-20"
              style={{ backgroundImage: 'radial-gradient(#4849da 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

            {/* Paper card */}
            <div className="relative bg-white p-4 shadow-2xl max-w-md w-full"
              style={{ transform: 'rotate(0.5deg)', aspectRatio: '3/4', maxHeight: '80%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {currentPage ? (
                <img
                  src={currentPage.image_url}
                  alt="Bài làm của sinh viên"
                  className="w-full h-full object-contain"
                  style={{ filter: 'grayscale(15%) contrast(1.1)', opacity: 0.9 }}
                />
              ) : (
                /* Placeholder for demo — simulated handwriting paper */
                <div className="w-full h-full flex flex-col gap-3 p-4">
                  {[
                    "Câu 1: lim(x→0) sin(3x)/x = 3",
                    "Áp dụng L'Hôpital: lim = 3·cos(3x)/1 | x=0 = 3",
                    "---",
                    "Câu 2: ∫x·ln(x)dx",
                    "= (x²/2)·ln(x) - ∫(x²/2)·(1/x)dx",
                    "= (x²/2)·ln(x) - x²/4 + C",
                  ].map((line, i) => (
                    <div key={i} className={`h-5 rounded ${line === '---' ? 'h-px bg-gray-200 my-1' : ''}`}
                      style={{
                        background: line === '---' ? '#e5e7eb' : `rgba(56,56,47,${0.15 + (i % 3) * 0.08})`,
                        width: line === '---' ? '100%' : `${60 + (i * 7) % 35}%`,
                      }} />
                  ))}
                  <p className="absolute bottom-6 right-6 text-xs font-mono" style={{ color: '#65655b', opacity: 0.5 }}>
                    trang_1.jpg
                  </p>
                </div>
              )}

              {/* Highlight overlay (simulating OCR bounding box) */}
              <div className="absolute rounded" style={{
                top: '30%', left: '10%', width: '80%', height: '12%',
                border: '2px solid rgba(72,73,218,0.4)',
                background: 'rgba(72,73,218,0.05)',
              }} />
            </div>

            {/* Zoom / rotate controls */}
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button className="p-2 rounded-full neumorphic-lift active:scale-95 transition-all"
                style={{ background: 'rgba(255,255,255,0.85)', color: '#38382f' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>zoom_in</span>
              </button>
              <button className="p-2 rounded-full neumorphic-lift active:scale-95 transition-all"
                style={{ background: 'rgba(255,255,255,0.85)', color: '#38382f' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>rotate_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: AI Panel ── */}
        <div className="w-[480px] flex-shrink-0 flex flex-col overflow-hidden" style={{ background: '#f6f4ea' }}>
          {/* Student header */}
          <div className="flex items-center justify-between px-8 py-5"
            style={{ borderBottom: '1px solid rgba(187,186,174,0.2)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm neumorphic-lift"
                style={{ background: '#e1e0ff', color: '#3b3acd' }}>
                {sub.student.display_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <h2 className="font-extrabold" style={{ color: '#38382f' }}>{sub.student.display_name}</h2>
                <p className="text-xs" style={{ color: '#65655b' }}>ID: {sub.id}</p>
              </div>
            </div>
            <span className="text-[10px] font-black px-3 py-1 rounded-full"
              style={{
                background: isVerified ? 'rgba(202,235,205,0.5)' : 'rgba(254,139,112,0.2)',
                color: isVerified ? '#3c5842' : '#742410',
              }}>
              {sub.ocr_status.toUpperCase()}
            </span>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8">

            {/* AI Interpretation */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: '#65655b' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#4849da' }}>psychology</span>
                  Văn bản AI nhận dạng
                </h3>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                  style={{ background: '#caebcd', color: '#3c5842' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#4e6b53' }} />
                  <span className="text-[10px] font-black uppercase">{confidencePct}% Tin cậy</span>
                </div>
              </div>
              <div className="p-4 rounded-xl border-l-4 italic text-sm neumorphic-pressed"
                style={{ background: '#f6f4ea', borderColor: 'rgba(72,73,218,0.25)', color: 'rgba(56,56,47,0.8)' }}>
                {currentPage?.ocr_text || 'Không phát hiện văn bản.'}
              </div>
            </div>

            {/* AI Grading Evaluation */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: '#65655b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#4849da' }}>award_star</span>
                AI Chấm Điểm
              </h3>
              <div className="neumorphic-pressed rounded-xl p-5 space-y-4" style={{ background: '#f0eee3' }}>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-3xl font-black" style={{ color: '#4849da' }}>{currentGrade?.ai_score ?? '--'}</span>
                    <span className="text-sm font-bold ml-1" style={{ color: '#65655b' }}>/100</span>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                    style={{ background: '#e1e0ff', color: '#3b3acd' }}>
                    Độ tin cậy: {agentConfPct}%
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'rgba(101,101,91,0.7)' }}>
                    Lý do chấm
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(56,56,47,0.8)' }}>
                    {currentGrade?.ai_reasoning || 'Đang phân tích...'}
                  </p>
                </div>

                {/* Score slider */}
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase" style={{ color: 'rgba(101,101,91,0.7)' }}>
                      Điều chỉnh điểm cuối
                    </label>
                    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(72,73,218,0.1)', color: '#4849da' }}>
                      {overrideScore}
                    </span>
                  </div>
                  <input
                    type="range" min={0} max={100}
                    value={overrideScore}
                    onChange={(e) => setOverrideScore(Number(e.target.value))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer neumorphic-pressed"
                    style={{ accentColor: '#4849da', background: '#e4e3d4' }}
                  />
                </div>
              </div>
            </div>

            {/* Teacher Comment */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: '#65655b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#4849da' }}>edit_note</span>
                Nhận xét giáo viên
              </h3>
              <div className="neumorphic-pressed rounded-xl p-4" style={{ background: '#f0eee3' }}>
                <textarea
                  placeholder="Thêm nhận xét cho sinh viên (không bắt buộc)..."
                  className="w-full bg-transparent border-none outline-none text-sm resize-none"
                  rows={4}
                  style={{ color: '#38382f' }}
                />
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tight neumorphic-lift"
                style={{ background: '#f6f4ea', color: '#38382f' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>style</span>
                {data.submission.exam_batch_id}
              </div>
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tight neumorphic-lift"
                style={{ background: '#f6f4ea', color: '#38382f' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>person</span>
                {sub.student.display_name.split(' ').pop()}
              </div>
            </div>
          </div>

          {/* ── Sticky Footer ── */}
          <div className="flex-shrink-0 p-6 neumorphic-lift"
            style={{ background: '#fcf9f1', borderTop: '1px solid rgba(187,186,174,0.2)' }}>
            <div className="flex items-center justify-between gap-4">
              <button
                className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all hover:-translate-y-0.5 active:scale-95 neumorphic-lift"
                style={{ color: '#38382f', background: '#F2EFE9' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>flag</span>
                Đánh dấu xem xét
              </button>
              <div className="flex items-center gap-3">
                <Link href={`/exams/${sub.exam_batch_id}`}
                  className="px-5 py-3 rounded-full font-bold text-sm transition-all"
                  style={{ color: '#65655b' }}>
                  Huỷ
                </Link>
                <button
                  className="flex items-center gap-2 px-8 py-3 rounded-full font-bold text-sm shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #4849da, #3b3bce)',
                    color: '#faf6ff',
                    boxShadow: '0 4px 20px rgba(72,73,218,0.3)',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                  Xác nhận điểm AI
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

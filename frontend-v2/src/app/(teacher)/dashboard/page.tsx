'use client';

import React, { useEffect, useState } from 'react';
import { fetchDashboardStats } from '@/lib/api/dashboard';
import { fetchExams } from '@/lib/api/exams';
import { DashboardStats } from '@/types/dashboard';
import { Exam } from '@/types/exam';
import Link from 'next/link';

const subjectIcon: Record<string, string> = {
  Mathematics: 'functions',
  Physics: 'bolt',
  History: 'history_edu',
  Biology: 'biotech',
  English: 'menu_book',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [activeTab, setActiveTab] = useState<'open' | 'completed'>('open');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, examsData] = await Promise.all([
          fetchDashboardStats(),
          fetchExams(),
        ]);
        setStats(statsData);
        setExams(examsData.data);
      } catch (error) {
        console.error('Failed to load dashboard data', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="material-symbols-outlined animate-spin text-primary" style={{ fontSize: '32px', color: '#4849da' }}>progress_activity</span>
      </div>
    );
  }

  const filteredExams = exams.filter((e) =>
    activeTab === 'open' ? e.status === 'active' : e.status !== 'active'
  );

  const urgentCount = stats?.confidence_risk?.filter((r) => r.level === 'critical').length ?? 0;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10">
      
      {/* 1. Alert Action Banner */}
      <section
        className="neumorphic-lift rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6"
        style={{
          background: 'linear-gradient(135deg, #fcf9f1, #F2EFE9)',
          border: '1px solid rgba(255,255,255,0.4)',
        }}
      >
        <div className="flex items-center gap-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center neumorphic-pressed"
            style={{ background: 'rgba(254,139,112,0.15)', color: '#a54731' }}
          >
            <span className="material-symbols-outlined icon-fill" style={{ fontSize: '28px' }}>priority_high</span>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: '#38382f' }}>
              {urgentCount} Exam Batches require attention
            </h1>
            <p className="font-medium mt-1" style={{ color: '#65655b' }}>
              AI confidence levels are below threshold for manual verification.
            </p>
          </div>
        </div>
        <Link
          href="/exams/new"
          className="flex items-center gap-2 px-8 py-4 rounded-full font-bold transition-all active:scale-95 whitespace-nowrap"
          style={{
            background: '#4849da',
            color: '#faf6ff',
            boxShadow: '0 4px 20px rgba(72,73,218,0.25)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add_circle</span>
          Create Exam
        </Link>
      </section>

      {/* 2. KPI Widgets Grid */}
      {stats && (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Widget 1: Live Submission Rate */}
          <div className="neumorphic-lift p-6 rounded-2xl flex flex-col gap-4" style={{ background: '#F2EFE9' }}>
            <div className="flex justify-between items-start">
              <span
                className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-1 rounded"
                style={{ background: '#e1e0ff', color: '#4849da' }}
              >
                Performance
              </span>
              <span className="material-symbols-outlined" style={{ color: '#818176', fontSize: '20px' }}>more_vert</span>
            </div>
            <h3 className="text-sm font-bold" style={{ color: '#65655b' }}>Live Submission Rate</h3>
            {/* Mini sparkline */}
            <div className="flex-1 flex items-center justify-center overflow-hidden h-20">
              <svg className="w-full h-full" viewBox="0 0 100 40" style={{ color: '#4849da' }}>
                <path d="M0 35 Q 20 35, 40 10 T 70 20 T 100 5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
                <path d="M0 35 Q 20 35, 40 10 T 70 20 T 100 5 L 100 40 L 0 40 Z" fill="currentColor" opacity="0.08" />
              </svg>
            </div>
            <p className="text-xl font-black">
              {stats.live_submission_rate}{' '}
              <span className="text-xs font-bold" style={{ color: '#4e6b53' }}>uploads/hr</span>
            </p>
          </div>

          {/* Widget 2: Task Priority */}
          <div className="neumorphic-lift p-6 rounded-2xl flex flex-col gap-4" style={{ background: '#F2EFE9' }}>
            <h3 className="text-sm font-bold" style={{ color: '#65655b' }}>Task Priority</h3>
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              <svg className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="56" cy="56" r="46" fill="transparent" stroke="#eae9dc" strokeWidth="12" />
                <circle
                  cx="56" cy="56" r="46" fill="transparent" stroke="#4849da" strokeWidth="12"
                  strokeDasharray="289"
                  strokeDashoffset={289 * (1 - stats.task_priority.urgent / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-lg font-black">{stats.task_priority.urgent}%</span>
                <span className="text-[8px] uppercase font-bold" style={{ color: '#818176' }}>Urgent</span>
              </div>
            </div>
            <div className="flex justify-between text-[10px] font-bold">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: '#4849da' }}></span>
                <span>High {stats.task_priority.high}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: '#eae9dc' }}></span>
                <span>Standard {stats.task_priority.standard}</span>
              </div>
            </div>
          </div>

          {/* Widget 3: Score Distribution */}
          <div className="neumorphic-lift p-6 rounded-2xl flex flex-col gap-4" style={{ background: '#F2EFE9' }}>
            <h3 className="text-sm font-bold" style={{ color: '#65655b' }}>Score Dist.</h3>
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              <svg className="w-full h-20" viewBox="0 0 100 40" style={{ color: '#4849da' }}>
                <path d="M0 35 Q 20 35, 40 15 T 80 5 T 100 25" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
                <path d="M0 35 Q 20 35, 40 15 T 80 5 T 100 25 L 100 40 L 0 40 Z" fill="currentColor" opacity="0.08" />
              </svg>
            </div>
            <div className="flex justify-between items-baseline">
              <p className="text-xl font-black">{stats.avg_score}</p>
              <span className="text-xs font-bold" style={{ color: '#4e6b53' }}>+{stats.score_trend}%</span>
            </div>
          </div>

          {/* Widget 4: AI Confidence Risk */}
          <div className="neumorphic-lift p-6 rounded-2xl flex flex-col gap-3" style={{ background: '#F2EFE9' }}>
            <h3 className="text-sm font-bold" style={{ color: '#65655b' }}>Confidence Risk</h3>
            <ul className="space-y-2">
              {stats.confidence_risk.map((item) => (
                <li key={item.exam_code}
                  className="flex items-center justify-between p-2 neumorphic-pressed rounded-xl">
                  <span className="text-[10px] font-bold">{item.exam_code}</span>
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: item.level === 'critical' ? '#a54731' : '#875b2d' }}
                  >
                    {item.level.charAt(0).toUpperCase() + item.level.slice(1)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* 3. Exam Table */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tab pills */}
          <div className="flex p-1 neumorphic-pressed rounded-full w-fit">
            <button
              onClick={() => setActiveTab('open')}
              className="px-6 py-2 rounded-full text-sm font-bold transition-all"
              style={{
                background: activeTab === 'open' ? '#F2EFE9' : 'transparent',
                color: activeTab === 'open' ? '#4849da' : '#65655b',
                boxShadow: activeTab === 'open'
                  ? '-4px -4px 8px rgba(255,255,255,0.8), 4px 4px 8px rgba(72,73,218,0.06)'
                  : 'none',
              }}
            >
              Open Exams
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className="px-6 py-2 rounded-full text-sm font-bold transition-all opacity-60 hover:opacity-100"
              style={{
                background: activeTab === 'completed' ? '#F2EFE9' : 'transparent',
                color: activeTab === 'completed' ? '#4849da' : '#65655b',
                boxShadow: activeTab === 'completed'
                  ? '-4px -4px 8px rgba(255,255,255,0.8), 4px 4px 8px rgba(72,73,218,0.06)'
                  : 'none',
              }}
            >
              Completed Exams
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 neumorphic-lift rounded-lg active:scale-95 transition-all"
              style={{ color: '#65655b' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>filter_list</span>
            </button>
            <button className="p-2 neumorphic-lift rounded-lg active:scale-95 transition-all"
              style={{ color: '#65655b' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>file_download</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto pb-4">
          <table className="w-full border-separate" style={{ borderSpacing: '0 12px' }}>
            <thead>
              <tr className="text-left">
                {['Code', 'Subject', 'Date', 'Papers', 'Progress', 'Confidence', 'Status', ''].map((h) => (
                  <th key={h} className="px-6 text-[10px] font-extrabold uppercase tracking-widest pb-2"
                    style={{ color: '#65655b' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredExams.map((exam) => {
                const progressFill = Math.round((exam.total_submissions / exam.total_expected) * 4);
                const confidencePct = Math.round(exam.avg_confidence * 100);
                const isActive = exam.status === 'active';
                const icon = subjectIcon[exam.subject] || 'school';
                const date = new Date(exam.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                return (
                  <tr key={exam.id}
                    className="neumorphic-lift neumorphic-hover cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.35)' }}>
                    <td className="px-6 py-5 font-bold text-sm rounded-l-2xl">{exam.qr_token}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: 'rgba(225,224,255,0.4)', color: '#4849da' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{icon}</span>
                        </div>
                        <span className="font-bold text-sm">{exam.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm" style={{ color: '#65655b' }}>{date}</td>
                    <td className="px-6 py-5 text-sm font-bold text-center">
                      {exam.total_submissions} / {exam.total_expected}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="h-1.5 w-5 rounded-full"
                            style={{ background: i <= progressFill ? '#4849da' : '#eae9dc' }} />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase"
                        style={{
                          background: confidencePct >= 90 ? '#caebcd' : '#fe8b70',
                          color: confidencePct >= 90 ? '#3c5842' : '#742410',
                        }}
                      >
                        {confidencePct}% {confidencePct >= 90 ? 'High' : 'Low'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase"
                        style={{ color: isActive ? '#4e6b53' : '#a54731' }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            background: isActive ? '#4e6b53' : '#a54731',
                            animation: isActive ? 'none' : 'pulse 1.5s infinite',
                          }}
                        />
                        {isActive ? 'Active' : 'Attention'}
                      </span>
                    </td>
                    <td className="px-6 py-5 rounded-r-2xl text-right">
                      <Link href={`/exams/${exam.id}`}
                        className="p-2 rounded-full transition-all hover:scale-110"
                        style={{ color: '#4849da' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chevron_right</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

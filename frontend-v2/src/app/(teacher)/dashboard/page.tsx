'use client';

import React, { useEffect, useState } from 'react';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ExamTable } from '@/components/dashboard/ExamTable';
import { fetchDashboardStats } from '@/lib/api/dashboard';
import { fetchExams } from '@/lib/api/exams';
import { DashboardStats } from '@/types/dashboard';
import { Exam } from '@/types/exam';
import Link from 'next/link';

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
          fetchExams()
        ]);
        setStats(statsData);
        setExams(examsData.data);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <div className="p-8 flex justify-center text-gray-400">Loading dashboard...</div>;
  }

  const filteredExams = exams.filter(e => 
    activeTab === 'open' ? e.status === 'active' : e.status !== 'active'
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Mission Control</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back, Prof. Alabaster</p>
        </div>
        <Link 
          href="/exams/new" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          + Create New Action
        </Link>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard 
            title="Live Submission Rate" 
            value={`${stats.live_submission_rate}/hr`}
            icon={<span>⚡</span>} 
          />
          <KpiCard 
            title="Task Priority" 
            value={stats.task_priority.urgent}
            subtitle={`${stats.task_priority.high} High, ${stats.task_priority.standard} Standard`}
            variant="warning"
            icon={<span>🚨</span>}
          />
          <KpiCard 
            title="Average Score" 
            value={`${stats.avg_score}%`}
            trend={{ value: stats.score_trend, isPositive: true }}
            icon={<span>📊</span>}
          />
          <KpiCard 
            title="Confidence Risk" 
            value={stats.confidence_risk.filter(r => r.level === 'critical').length}
            subtitle="Batches require manual verification"
            variant="danger"
            icon={<span>⚠️</span>}
          />
        </div>
      )}

      <div className="mt-8">
        <div className="flex space-x-6 border-b border-gray-200 mb-6">
          <button 
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'open' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('open')}
          >
            Open Actions
          </button>
          <button 
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'completed' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed Action
          </button>
        </div>
        
        <ExamTable exams={filteredExams} />
      </div>
    </div>
  );
}

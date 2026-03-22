'use client';

import React from 'react';

const mockQuestions = [
  { id: 'Q001', subject: 'Mathematics', title: 'Calculus Limit Definition', created: '2026-03-01' },
  { id: 'Q002', subject: 'Mathematics', title: 'Integration by Parts', created: '2026-03-10' },
  { id: 'Q003', subject: 'Physics', title: 'Newton second law derivation', created: '2026-03-12' },
];

export default function QuestionBankPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Question Bank</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your reusable exam questions and associated AI grading rubrics.</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm">
          + Map New Question
        </button>
      </div>

      <div className="glass-panel overflow-hidden rounded-2xl">
        <div className="p-4 border-b border-slate-200/50 bg-slate-50/50 flex space-x-4">
           <input type="text" placeholder="Search questions..." className="w-64 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
           <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none text-slate-600">
             <option>All Subjects</option>
             <option>Mathematics</option>
             <option>Physics</option>
           </select>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/60 text-slate-500 text-sm">
              <th className="px-6 py-4 font-medium">Question Title</th>
              <th className="px-6 py-4 font-medium">Subject</th>
              <th className="px-6 py-4 font-medium">Mapped Rubric</th>
              <th className="px-6 py-4 font-medium">Created On</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {mockQuestions.map((q) => (
              <tr key={q.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4 font-medium text-slate-900">{q.title}</td>
                <td className="px-6 py-4 text-slate-600">{q.subject}</td>
                <td className="px-6 py-4"><span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 text-xs font-medium">Auto-Grader Ready</span></td>
                <td className="px-6 py-4 text-slate-500">{q.created}</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-indigo-600 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

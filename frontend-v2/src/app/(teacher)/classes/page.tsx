'use client';

import React from 'react';

const mockClasses = [
  { id: 'CLS901', name: 'Advanced Calculus 2026', students: 48, term: 'Spring 2026' },
  { id: 'CLS902', name: 'Introductory Physics 101', students: 120, term: 'Spring 2026' },
];

export default function ClassesPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Class Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your student rosters and integration IDs.</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm">
          + Add New Class
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockClasses.map((cls) => (
          <div key={cls.id} className="glass-panel hover-lift p-6 rounded-2xl flex flex-col group relative">
             <div className="flex justify-between items-start mb-6">
               <div>
                 <h3 className="text-lg font-bold text-slate-800">{cls.name}</h3>
                 <p className="text-slate-500 text-sm mt-1">{cls.term} • ID: {cls.id}</p>
               </div>
               <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
                  👥 {cls.students}
               </span>
             </div>
             
             <div className="mt-auto pt-5 border-t border-slate-100 flex justify-between items-center text-sm font-medium">
                <button className="text-slate-500 hover:text-slate-900 transition-colors">Manage Roster</button>
                <button className="text-indigo-600 hover:text-indigo-800 transition-colors">Integration Keys →</button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}

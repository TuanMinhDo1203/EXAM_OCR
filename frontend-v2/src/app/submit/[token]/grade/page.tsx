'use client';

import React, { use } from 'react';

export default function GradePortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden">
       {/* Fixed Header */}
       <div className="bg-indigo-600 text-white p-6 pb-12 rounded-b-[2.5rem] shadow-md z-10 relative">
          <div className="flex justify-between items-center mb-8">
             <span className="text-sm font-bold opacity-80 uppercase tracking-widest">Alabaster</span>
             <span className="bg-white/20 px-3 py-1 text-xs rounded-full backdrop-blur-sm font-medium">Graded</span>
          </div>
          
          <h1 className="text-2xl font-bold mb-1">Midterm 1: Calculus</h1>
          <p className="opacity-80 text-sm font-medium">Student: Michael Scott</p>
       </div>

       {/* Score Card that overlaps header */}
       <div className="px-6 relative z-20 -mt-6">
          <div className="bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-between">
             <div>
                <p className="text-sm text-slate-500 font-bold uppercase tracking-wider mb-1">Total Score</p>
                <div className="flex items-baseline space-x-1">
                   <span className="text-4xl font-extrabold text-slate-900">85</span>
                   <span className="text-lg font-bold text-slate-400">/ 100</span>
                </div>
             </div>
             <div className="w-16 h-16 rounded-full border-4 border-emerald-400 flex items-center justify-center text-emerald-500 bg-emerald-50">
                <span className="text-lg font-bold">B+</span>
             </div>
          </div>
       </div>

       {/* Feed of Grading Details */}
       <div className="flex-1 overflow-y-auto p-6 space-y-6 pt-8 pb-12">
          
          <div className="glass-panel p-5 rounded-2xl">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900 border-l-4 border-indigo-500 pl-3">Question 1 (Limits)</h3>
                <span className="text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded text-sm">20 / 20</span>
             </div>
             <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 whitespace-pre-line border border-slate-100 leading-relaxed">
                <p className="font-bold text-slate-800 mb-2">AI Feedback:</p>
                Excellent application of L'Hôpital's rule. Steps are perfectly structured and the final limit value is correct. Well done.
             </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900 border-l-4 border-amber-500 pl-3">Question 2 (Integrals)</h3>
                <span className="text-amber-600 font-bold bg-amber-50 px-3 py-1 rounded text-sm">15 / 20</span>
             </div>
             <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 whitespace-pre-line border border-slate-100 leading-relaxed mb-4">
                <p className="font-bold text-slate-800 mb-2">AI Feedback:</p>
                Correct setup using integration by parts, but there is a sign error on the second term integration which propagated to the final answer.
             </div>
             
             {/* Thumbnail of highlighted region */}
             <div className="w-full h-32 bg-slate-200 rounded-lg overflow-hidden relative group">
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
                {/* Simulated bounding box */}
                <div className="absolute top-1/4 left-1/4 w-1/3 h-1/4 border-2 border-red-500 bg-red-500/10"></div>
                <div className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-xs px-2 py-1 rounded">View Scan</div>
             </div>
          </div>

          <div className="text-center">
             <p className="text-xs text-slate-400 font-medium pb-8 border-b border-slate-200 w-full mb-8">
                Graded asynchronously by EXAM_OCR Auto-Grader V2.0
             </p>
          </div>
       </div>
    </div>
  );
}

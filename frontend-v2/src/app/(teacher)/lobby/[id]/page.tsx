/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';

// Giả lập lấy dữ liệu lobby
function fetchLobbyData(id: string) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id,
        exam_title: "Midterm 1 - Calculus",
        qr_url: "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=http://localhost:3000/submit/" + id,
        pin_code: "902-114",
        joined_count: 0
      });
    }, 500);
  });
}

export default function QrLobbyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [students, setStudents] = useState<string[]>([]);
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    fetchLobbyData(id).then(res => setData(res));
  }, [id]);

  // Giả lập realtime sinh viên join vào lobby
  useEffect(() => {
    if (!data) return;
    const interval = setInterval(() => {
      if (students.length < 50) {
        setStudents(prev => [...prev, `Student ${Math.floor(Math.random() * 1000)}`]);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [data, students.length]);

  if (!data) return <div className="p-8 text-slate-500">Initializing Display...</div>;

  return (
    <div className="absolute inset-0 bg-slate-900 z-50 flex flex-col pt-16">
      {/* Top Header */}
      <div className="px-8 py-6 flex justify-between items-center text-white border-b border-slate-800">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{data.exam_title}</h1>
          <p className="text-slate-400 mt-2">Waiting for students to join...</p>
        </div>
        <div className="flex items-center space-x-6">
           <Link href={`/exams/${id}`} className="text-slate-400 hover:text-white transition-colors">
              Exit Lobby
           </Link>
           {!isStarted ? (
             <button onClick={() => setIsStarted(true)} className="bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all">
               Start Exam Now
             </button>
           ) : (
             <span className="bg-green-500/10 text-green-400 px-6 py-3 rounded-xl font-bold border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)] animate-pulse">
               EXAM IN PROGRESS
             </span>
           )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: QR Display */}
        <div className="flex-1 flex flex-col items-center justify-center p-12 border-r border-slate-800">
          <div className="glass-panel !bg-white/5 rounded-[2.5rem] p-12 flex flex-col items-center border-slate-700 w-full max-w-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none"></div>
            
            <p className="text-slate-300 font-medium mb-8 text-lg">Scan this code to join</p>
            <div className="bg-white p-6 rounded-3xl shadow-2xl mb-10 w-64 h-64 relative z-10 hover-lift">
              {/* Using standard img to avoid next/image domain config limits in mock phase */}
              <img src={data.qr_url} alt="QR Code" className="w-full h-full object-contain" />
            </div>
            
            <div className="text-center relative z-10">
               <p className="text-slate-400 text-sm mb-2 uppercase tracking-widest font-bold">Or enter PIN code</p>
               <p className="text-5xl font-mono font-bold tracking-widest text-white">{data.pin_code}</p>
            </div>
          </div>
        </div>

        {/* Right: Real-time Feed */}
        <div className="w-[450px] bg-slate-900/50 p-8 flex flex-col">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-semibold text-slate-300">Live Attendees</h3>
             <span className="bg-slate-800 text-indigo-400 font-bold px-4 py-1.5 rounded-full border border-slate-700">
               {students.length} connected
             </span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {students.length === 0 ? (
               <div className="text-slate-500 flex flex-col items-center justify-center h-full text-sm">
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin mb-4"></div>
                  Listening for signals...
               </div>
            ) : (
              students.map((student, index) => (
                <div key={index} className="bg-slate-800/80 border border-slate-700/50 rounded-xl px-5 py-4 flex items-center justify-between text-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center space-x-3">
                     <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]"></div>
                     <span className="font-medium">{student}</span>
                  </div>
                  <span className="text-xs text-slate-500">Joined</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

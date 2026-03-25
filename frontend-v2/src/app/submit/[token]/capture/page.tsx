'use client';

import React, { use, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CameraCapturePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [capturing, setCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      sessionStorage.setItem(`submit-image:${token}`, String(reader.result || ''));
      setCapturing(true);
      router.push(`/submit/${token}/confirm`);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex-1 flex flex-col bg-black relative">
       {/* Fake Camera Feed Background */}
       <div className="absolute inset-0 bg-slate-800">
           {/* In reality this would be getting navigator.mediaDevices.getUserMedia() */}
           <div className="w-full h-full flex items-center justify-center opacity-30">
              <span className="text-white text-sm">Camera Feed Active</span>
           </div>
       </div>

       {/* Overlay UI */}
       <div className="absolute inset-x-0 top-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-10">
           <Link href={`/submit/${token}`} className="text-white p-2 rounded-full hover:bg-white/20 transition-colors">
              ✕ Cancel
           </Link>
           <span className="text-white font-medium text-sm px-3 py-1 bg-white/20 rounded-full backdrop-blur-md">
              Page 1 of 1
           </span>
       </div>

       {/* Alignment Guide (Bordered Box) */}
       <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-8 z-10">
          <div className="w-full aspect-[1/1.4] border-2 border-indigo-400 border-dashed rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
             <div className="absolute inset-0 flex items-center justify-center opacity-50">
                <span className="text-white font-bold tracking-widest uppercase">Align paper here</span>
             </div>
          </div>
       </div>

       {/* Bottom Controls */}
       <div className="absolute inset-x-0 bottom-0 p-8 flex flex-col items-center justify-end bg-gradient-to-t from-black/90 via-black/50 to-transparent z-10">
           <input
             ref={fileInputRef}
             type="file"
             accept="image/*"
             className="hidden"
             onChange={handleFileChange}
           />
           <input
             ref={cameraInputRef}
             type="file"
             accept="image/*"
             capture="environment"
             className="hidden"
             onChange={handleFileChange}
           />
           <div className="flex items-center gap-4 mb-6">
             <button
               type="button"
               className="px-5 py-3 rounded-xl border border-white/30 bg-white/10 text-white font-semibold backdrop-blur-sm transition-all hover:bg-white/20"
               onClick={() => fileInputRef.current?.click()}
             >
               Chọn từ máy
             </button>
             <button
               type="button"
               className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all ${capturing ? 'scale-90 bg-white' : 'bg-white/20 hover:bg-white/40'}`}
               onClick={() => cameraInputRef.current?.click()}
             >
                 <div className="w-16 h-16 bg-white rounded-full"></div>
             </button>
           </div>
           <p className="text-white text-sm font-medium">Ensure lighting is good and text is readable</p>
       </div>
    </div>
  );
}

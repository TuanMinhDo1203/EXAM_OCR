import Link from 'next/link';

export function Sidebar() {
  return (
    <div className="w-64 h-screen glass-panel fixed left-0 top-0 flex flex-col z-20">
      <div className="h-16 flex items-center px-6 border-b border-slate-200/50">
        <span className="text-xl font-bold tracking-tight gradient-text">EXAM_OCR</span>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-1">
        <Link href="/dashboard" className="block px-3 py-2 text-sm font-medium rounded-md bg-indigo-50 text-indigo-700">
          Dashboard
        </Link>
        <Link href="/classes" className="block px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
          Classes
        </Link>
        <Link href="/questions" className="block px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
          Question Bank
        </Link>
        <Link href="/settings" className="block px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
          Settings
        </Link>
      </nav>
      <div className="p-4 border-t border-slate-200/50">
        <div className="flex items-center">
          <div className="ml-3">
            <p className="text-sm font-medium text-slate-700">Prof. Alabaster</p>
            <p className="text-xs font-medium text-slate-500">View profile</p>
          </div>
        </div>
      </div>
    </div>
  );
}

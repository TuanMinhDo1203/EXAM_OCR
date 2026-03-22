export function TopBar() {
  return (
    <div className="h-16 glass-panel fixed top-0 right-0 left-64 z-10 flex items-center justify-between px-8">
      <div className="flex-1 max-w-lg">
        <input 
          type="text" 
          placeholder="Search exams, students, questions..." 
          className="w-full bg-slate-100/50 backdrop-blur-md border border-slate-200/50 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium text-slate-700 placeholder:text-slate-400"
        />
      </div>
      <div className="flex items-center space-x-6">
        <button className="text-slate-400 hover:text-indigo-600 transition-colors relative">
          <span className="sr-only">Notifications</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
        </button>
        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[2px] cursor-pointer hover:scale-105 transition-transform shadow-md">
          <div className="h-full w-full rounded-full bg-white flex items-center justify-center overflow-hidden">
             <span className="text-sm font-bold text-indigo-600">PA</span>
          </div>
        </div>
      </div>
    </div>
  );
}

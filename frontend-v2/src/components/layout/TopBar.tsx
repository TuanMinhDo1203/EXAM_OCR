'use client';

export default function TopBar() {
  return (
    <header
      className="sticky top-0 w-full z-50 flex items-center justify-between px-6 py-3"
      style={{
        background: 'rgba(242, 239, 233, 0.85)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full neumorphic-pressed">
          <span className="material-symbols-outlined text-sm" style={{ color: '#818176', fontSize: '18px' }}>
            search
          </span>
          <input
            className="bg-transparent border-none outline-none text-sm w-64"
            placeholder="Search exams, students, questions..."
            type="text"
            style={{ color: '#38382f' }}
          />
        </div>
      </div>

      {/* Right icons */}
      <div className="flex items-center gap-2">
        <button
          className="w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95"
          style={{ color: '#65655b' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(72,73,218,0.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>notifications</span>
        </button>
        <button
          className="w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95"
          style={{ color: '#65655b' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(72,73,218,0.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>help</span>
        </button>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm neumorphic-lift cursor-pointer"
          style={{ background: '#e1e0ff', color: '#3b3acd' }}
        >
          PA
        </div>
      </div>
    </header>
  );
}

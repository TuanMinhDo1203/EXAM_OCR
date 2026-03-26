'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { href: '/classes', icon: 'groups', label: 'Classes' },
  { href: '/questions', icon: 'description', label: 'Exam Bank' },
];

const bottomItems = [
  { href: '/settings', icon: 'settings', label: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full flex flex-col p-6 space-y-8 w-64 z-40 hidden md:flex"
      style={{ background: '#F2EFE9', boxShadow: '6px 0 12px rgba(0,0,0,0.02)' }}>
      
      {/* Logo */}
      <div className="flex items-center gap-3 px-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white neumorphic-lift"
          style={{ background: '#4849da' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>auto_stories</span>
        </div>
        <span className="text-lg font-black tracking-tighter" style={{ color: '#38382f' }}>
          FPTU Academy
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-full text-sm font-semibold tracking-wide uppercase transition-all
                ${isActive
                  ? 'text-primary neumorphic-pressed'
                  : 'opacity-60 hover:opacity-100 hover:translate-x-1'
                }`}
              style={{ color: isActive ? '#4849da' : '#38382f' }}
            >
              <span className={`material-symbols-outlined ${isActive ? 'icon-fill' : ''}`}
                style={{ fontSize: '20px' }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="pt-6 space-y-2" style={{ borderTop: '1px solid rgba(187,186,174,0.2)' }}>
        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center space-x-3 px-4 py-3 opacity-60 hover:opacity-100 transition-all text-sm font-semibold tracking-wide uppercase"
            style={{ color: '#38382f' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}

        {/* User profile card */}
        <div className="p-4 neumorphic-pressed rounded-2xl mt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm neumorphic-lift"
              style={{ background: '#e1e0ff', color: '#3b3acd' }}>
              PA
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: '#38382f' }}>Prof. FPTU</p>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#65655b' }}>
                Senior Educator
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

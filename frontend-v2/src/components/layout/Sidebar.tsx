import Link from 'next/link';

export function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen sticky top-0 flex flex-col hidden md:flex">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight">Alabaster Academy</h1>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-1">
        <Link href="/dashboard" className="block px-3 py-2 text-sm font-medium rounded-md bg-blue-50 text-blue-700">
          Dashboard
        </Link>
        <Link href="/classes" className="block px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50">
          Classes
        </Link>
        <Link href="/questions" className="block px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50">
          Exam Bank
        </Link>
      </nav>
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center font-bold text-gray-700">A</div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700">Prof. Alabaster</p>
            <p className="text-xs text-gray-500">Senior Educator</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

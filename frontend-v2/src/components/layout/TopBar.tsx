export function TopBar() {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search exams..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-full focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button className="text-gray-500 hover:text-gray-700 p-2">
            🔔
          </button>
        </div>
      </div>
    </header>
  );
}

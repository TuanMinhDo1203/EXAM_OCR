export default function SubmitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-900 flex justify-center items-start md:items-center">
      <div className="w-full max-w-md bg-white min-h-screen md:min-h-[85vh] md:rounded-3xl md:shadow-2xl overflow-hidden flex flex-col relative text-slate-800">
        {children}
      </div>
    </div>
  );
}

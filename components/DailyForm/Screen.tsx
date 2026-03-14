export default function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F2ED] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl bg-white rounded-3xl p-8 md:p-12 shadow-[0_20px_60px_-10px_rgba(107,26,42,0.1),0_8px_24px_-4px_rgba(0,0,0,0.06)]">
        {children}
      </div>
    </div>
  );
}

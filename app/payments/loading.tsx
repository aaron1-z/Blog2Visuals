export default function PaymentsLoading() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-[#0c0a09]" />
      <div className="fixed inset-0 grid-pattern" />
      <div className="fixed inset-0 noise-overlay" />

      <div className="relative z-10">
        {/* Header Skeleton */}
        <header className="border-b border-stone-800 bg-[#0c0a09]/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-stone-800 animate-pulse" />
                <div className="h-5 w-32 bg-stone-800 rounded animate-pulse" />
              </div>
              <div className="flex items-center gap-4">
                <div className="h-4 w-20 bg-stone-800 rounded animate-pulse" />
                <div className="h-4 w-20 bg-stone-800 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Skeleton */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Page Header */}
          <div className="mb-8">
            <div className="h-8 w-48 bg-stone-800 rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-64 bg-stone-800 rounded animate-pulse" />
          </div>

          {/* Table Skeleton */}
          <div className="rounded-2xl bg-[#1c1917]/80 border border-stone-800 overflow-hidden">
            {/* Header */}
            <div className="flex border-b border-stone-800 px-6 py-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex-1">
                  <div className="h-4 w-16 bg-stone-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
            {/* Rows */}
            {[1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="flex border-b border-stone-800/50 px-6 py-4">
                {[1, 2, 3, 4, 5].map((col) => (
                  <div key={col} className="flex-1">
                    <div className="h-4 w-20 bg-stone-800 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

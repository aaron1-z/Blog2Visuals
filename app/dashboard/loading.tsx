export default function DashboardLoading() {
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
                <div className="h-8 w-24 bg-stone-800 rounded-lg animate-pulse" />
                <div className="h-10 w-24 bg-stone-800 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Skeleton */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Welcome Section */}
          <div className="mb-12">
            <div className="h-10 w-72 bg-stone-800 rounded-lg animate-pulse mb-2" />
            <div className="h-5 w-48 bg-stone-800 rounded animate-pulse" />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 rounded-2xl bg-[#1c1917]/80 border border-stone-800">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-stone-800 animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-stone-800 rounded animate-pulse mb-2" />
                    <div className="h-6 w-16 bg-stone-800 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="h-6 w-32 bg-stone-800 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="p-6 rounded-2xl bg-[#1c1917]/80 border border-stone-800">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-stone-800 animate-pulse" />
                  <div className="flex-1">
                    <div className="h-5 w-32 bg-stone-800 rounded animate-pulse mb-2" />
                    <div className="h-4 w-48 bg-stone-800 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

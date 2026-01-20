"use client";

import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import InfographicPreview from "../components/InfographicPreview";

export default function ExamplesPage() {
  const { isAuthenticated } = useAuth();

  const examples = [
    {
      title: "Tech Blog Post",
      summary: "Artificial Intelligence is revolutionizing software development. Key trends include: automated code generation, intelligent debugging, and predictive analytics. Companies adopting AI report 40% faster development cycles and 30% fewer bugs.",
      theme: "sunset" as const,
      source: "techcrunch.com",
    },
    {
      title: "Marketing Guide",
      summary: "Content marketing in 2026 requires a multi-channel approach. Focus areas: video content dominance, AI personalization, community building, and authentic storytelling. Brands seeing 3x engagement with these strategies.",
      theme: "ocean" as const,
      source: "hubspot.com",
    },
    {
      title: "Productivity Tips",
      summary: "Remote work productivity hacks that actually work: time-blocking, the 2-minute rule, digital minimalism, and async communication. Teams report 25% productivity boost after implementing these practices.",
      theme: "forest" as const,
      source: "medium.com",
    },
    {
      title: "Startup Insights",
      summary: "Top startup lessons from successful founders: validate before building, focus on one problem, hire slow fire fast, and embrace customer feedback. 80% of successful startups pivoted at least once.",
      theme: "purple" as const,
      source: "ycombinator.com",
    },
    {
      title: "Design Trends",
      summary: "UI/UX trends shaping 2026: glassmorphism evolution, 3D elements, micro-interactions, dark mode by default, and accessibility-first design. User retention increases 40% with modern design patterns.",
      theme: "midnight" as const,
      source: "dribbble.com",
    },
    {
      title: "Finance Tips",
      summary: "Personal finance fundamentals for beginners: emergency fund first, automate savings, invest early, avoid lifestyle creep. Starting at 25 vs 35 can mean 2x more retirement savings.",
      theme: "sunset" as const,
      source: "investopedia.com",
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-[#0c0a09]" />
      <div className="fixed inset-0 grid-pattern" />
      <div className="fixed inset-0 noise-overlay" />
      
      {/* Gradient orbs */}
      <div className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-orange-500/20 via-orange-600/5 to-transparent blur-3xl" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-amber-500/10 via-orange-500/5 to-transparent blur-3xl" />

      <div className="relative z-10">
        {/* Header */}
        <header>
          <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
                Blog<span className="text-orange-500">2</span>Visuals
              </span>
            </Link>
            
            <div className="hidden md:flex items-center gap-8">
              <Link href="/features" className="text-sm text-stone-400 hover:text-white transition-colors">Features</Link>
              <Link href="/pricing" className="text-sm text-stone-400 hover:text-white transition-colors">Pricing</Link>
              <Link href="/examples" className="text-sm text-orange-400 font-medium">Examples</Link>
            </div>

            <Link 
              href={isAuthenticated ? "/dashboard" : "/login"}
              className="px-5 py-2.5 text-sm font-medium rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
            >
              {isAuthenticated ? "Dashboard" : "Sign In"}
            </Link>
          </nav>
        </header>

        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 mb-8">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-sm text-orange-400 font-medium">Gallery</span>
          </div>
          
          <h1 
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6"
            style={{ fontFamily: 'var(--font-syne), sans-serif' }}
          >
            See what you can{" "}
            <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              create
            </span>
          </h1>
          
          <p className="text-lg text-stone-400 max-w-2xl mx-auto">
            Browse examples of infographics generated by Blog2Visuals. 
            Each one was created from a real blog post in seconds.
          </p>
        </section>

        {/* Examples Grid */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {examples.map((example, index) => (
              <div
                key={index}
                className="group"
              >
                <div className="rounded-2xl overflow-hidden border border-stone-800 hover:border-stone-700 hover:border-orange-500/30 transition-all duration-300 bg-[#1c1917]/50 hover:shadow-xl hover:shadow-orange-500/5">
                  {/* Infographic Preview - Using aspect-ratio container */}
                  <div className="aspect-square p-3">
                    <InfographicPreview 
                      summary={example.summary} 
                      theme={example.theme}
                      title={example.title}
                    />
                  </div>
                </div>
                
                {/* Info */}
                <div className="mt-4 px-2">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white group-hover:text-orange-400 transition-colors" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
                      {example.title}
                    </h3>
                    <span className="text-xs text-stone-500 bg-stone-800 px-2.5 py-1 rounded-full capitalize">
                      {example.theme}
                    </span>
                  </div>
                  <p className="text-sm text-stone-500">
                    Source: {example.source}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Theme Showcase */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
              5 Beautiful Themes
            </h2>
            <p className="text-stone-400 max-w-xl mx-auto">
              Choose from our carefully crafted color themes to match your brand
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {[
              { id: "sunset", name: "Sunset", colors: "from-orange-500 to-purple-600" },
              { id: "ocean", name: "Ocean", colors: "from-cyan-500 to-indigo-700" },
              { id: "forest", name: "Forest", colors: "from-emerald-500 to-teal-700" },
              { id: "purple", name: "Purple", colors: "from-violet-600 to-fuchsia-600" },
              { id: "midnight", name: "Midnight", colors: "from-slate-900 to-neutral-900" },
            ].map((theme) => (
              <div
                key={theme.id}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#1c1917]/50 border border-stone-800"
              >
                <div className={`w-20 h-20 rounded-xl bg-gradient-to-br ${theme.colors} shadow-lg`} />
                <span className="text-sm text-stone-300 font-medium">{theme.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="p-8 md:p-12 rounded-3xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
              Ready to create your own?
            </h2>
            <p className="text-stone-400 max-w-xl mx-auto mb-8">
              Transform your blog posts into stunning infographics in seconds.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Start Creating
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-stone-800/50">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-stone-500 text-sm">
                <span>© 2026 Blog2Visuals.</span>
                <span>Powered by AI.</span>
              </div>
              <div className="flex items-center gap-6">
                <Link href="/privacy" className="text-sm text-stone-500 hover:text-white transition-colors">Privacy</Link>
                <Link href="/terms" className="text-sm text-stone-500 hover:text-white transition-colors">Terms</Link>
                <Link href="/contact" className="text-sm text-stone-500 hover:text-white transition-colors">Contact</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";

export default function FeaturesPage() {
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: "Lightning Fast Generation",
      description: "Transform any blog post into a stunning infographic in under 30 seconds. Our AI processes content instantly.",
      color: "orange",
    },
    {
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: "AI-Powered Summarization",
      description: "Our advanced AI extracts key insights and talking points from your content automatically.",
      color: "amber",
    },
    {
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      title: "Multiple Themes",
      description: "Choose from 5 beautiful gradient themes: Sunset, Ocean, Forest, Purple, and Midnight.",
      color: "purple",
    },
    {
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      ),
      title: "Social Media Ready",
      description: "Export in perfect 1080x1080 PNG format, optimized for Instagram, LinkedIn, Twitter and more.",
      color: "cyan",
    },
    {
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      title: "Auto-Generated Captions",
      description: "Get ready-to-post captions for Twitter/X and LinkedIn generated from your content.",
      color: "emerald",
    },
    {
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
      title: "High-Quality Export",
      description: "Download crisp, high-resolution PNG images at 2x scale for retina displays.",
      color: "rose",
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      orange: { bg: "from-orange-500/10 to-amber-500/10", border: "border-orange-500/20", text: "text-orange-400" },
      amber: { bg: "from-amber-500/10 to-yellow-500/10", border: "border-amber-500/20", text: "text-amber-400" },
      purple: { bg: "from-purple-500/10 to-violet-500/10", border: "border-purple-500/20", text: "text-purple-400" },
      cyan: { bg: "from-cyan-500/10 to-blue-500/10", border: "border-cyan-500/20", text: "text-cyan-400" },
      emerald: { bg: "from-emerald-500/10 to-green-500/10", border: "border-emerald-500/20", text: "text-emerald-400" },
      rose: { bg: "from-rose-500/10 to-pink-500/10", border: "border-rose-500/20", text: "text-rose-400" },
    };
    return colors[color] || colors.orange;
  };

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
              <Link href="/features" className="text-sm text-orange-400 font-medium">Features</Link>
              <Link href="/pricing" className="text-sm text-stone-400 hover:text-white transition-colors">Pricing</Link>
              <Link href="/examples" className="text-sm text-stone-400 hover:text-white transition-colors">Examples</Link>
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
            <span className="text-sm text-orange-400 font-medium">Powerful Features</span>
          </div>
          
          <h1 
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6"
            style={{ fontFamily: 'var(--font-syne), sans-serif' }}
          >
            Everything you need to create{" "}
            <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              viral visuals
            </span>
          </h1>
          
          <p className="text-lg text-stone-400 max-w-2xl mx-auto">
            Blog2Visuals combines AI-powered content extraction with beautiful design templates 
            to help you create share-worthy infographics in seconds.
          </p>
        </section>

        {/* Features Grid */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const colors = getColorClasses(feature.color);
              return (
                <div
                  key={index}
                  className={`group p-6 rounded-2xl bg-gradient-to-br ${colors.bg} border ${colors.border} hover:scale-[1.02] transition-all duration-300`}
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colors.bg} border ${colors.border} flex items-center justify-center ${colors.text} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
                    {feature.title}
                  </h3>
                  <p className="text-stone-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* How It Works */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
              How it works
            </h2>
            <p className="text-stone-400 max-w-xl mx-auto">
              Three simple steps to transform your blog content into engaging visuals
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Paste URL", desc: "Copy and paste any blog post URL" },
              { step: "2", title: "AI Processes", desc: "Our AI extracts and summarizes content" },
              { step: "3", title: "Download", desc: "Get your infographic ready for sharing" },
            ].map((item, index) => (
              <div key={index} className="relative text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-orange-500/25">
                  {item.step}
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-orange-500/50 to-transparent" />
                )}
                <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
                  {item.title}
                </h3>
                <p className="text-stone-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="p-8 md:p-12 rounded-3xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
              Ready to get started?
            </h2>
            <p className="text-stone-400 max-w-xl mx-auto mb-8">
              Start creating stunning infographics today. No credit card required for your first export.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Try It Free
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

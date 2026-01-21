"use client";

interface InfographicPreviewProps {
  title?: string;
  summary: string;
  theme?: "sunset" | "ocean" | "forest" | "purple" | "midnight";
  forExport?: boolean; // When true, renders at fixed 1080x1080 for PNG export
}

const themes = {
  sunset: {
    bg: "from-orange-600 via-rose-500 to-purple-600",
    accent: "bg-white/20",
    text: "text-white",
    bullet: "bg-amber-300",
    cta: "text-white/70",
    accentColor: "rgba(251, 191, 36, 0.8)", // amber-300
  },
  ocean: {
    bg: "from-cyan-500 via-blue-600 to-indigo-700",
    accent: "bg-white/20",
    text: "text-white",
    bullet: "bg-cyan-300",
    cta: "text-white/70",
    accentColor: "rgba(103, 232, 249, 0.8)", // cyan-300
  },
  forest: {
    bg: "from-emerald-500 via-green-600 to-teal-700",
    accent: "bg-white/20",
    text: "text-white",
    bullet: "bg-emerald-300",
    cta: "text-white/70",
    accentColor: "rgba(110, 231, 183, 0.8)", // emerald-300
  },
  purple: {
    bg: "from-violet-600 via-purple-600 to-fuchsia-600",
    accent: "bg-white/20",
    text: "text-white",
    bullet: "bg-violet-300",
    cta: "text-white/70",
    accentColor: "rgba(196, 181, 253, 0.8)", // violet-300
  },
  midnight: {
    bg: "from-slate-900 via-zinc-800 to-neutral-900",
    accent: "bg-white/10",
    text: "text-white",
    bullet: "bg-orange-400",
    cta: "text-white/50",
    accentColor: "rgba(251, 146, 60, 0.8)", // orange-400
  },
};

function extractBulletPoints(summary: string): string[] {
  // Split by sentences and clean up
  const sentences = summary
    .replace(/([.!?])\s+/g, "$1|")
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 5); // Reduced minimum length

  // Take up to 4 key points, try to balance lengths
  const points: string[] = [];
  const maxPoints = Math.min(sentences.length, 4);

  for (let i = 0; i < maxPoints; i++) {
    let point = sentences[i];

    // Remove trailing period for cleaner look
    if (point.endsWith(".")) {
      point = point.slice(0, -1);
    }

    // More generous length limits for better readability
    const maxLength = maxPoints <= 2 ? 120 : maxPoints === 3 ? 100 : 85;

    if (point.length > maxLength) {
      // Find the last space before the limit
      const lastSpace = point.lastIndexOf(" ", maxLength);
      if (lastSpace > maxLength * 0.7) {
        point = point.substring(0, lastSpace) + "...";
      } else {
        // Try to end at a comma or other natural break
        const breakChars = [",", ";", ":", "-"];
        let bestBreak = -1;
        for (const char of breakChars) {
          const pos = point.lastIndexOf(char, maxLength);
          if (pos > bestBreak && pos > maxLength * 0.6) {
            bestBreak = pos;
          }
        }
        if (bestBreak > 0) {
          point = point.substring(0, bestBreak + 1); // Include the break character
        } else {
          // Force break at word boundary if possible
          const forcedBreak = point.lastIndexOf(" ", maxLength);
          if (forcedBreak > 0) {
            point = point.substring(0, forcedBreak) + "...";
          } else {
            point = point.substring(0, maxLength - 3) + "...";
          }
        }
      }
    }
    points.push(point);
  }

  return points;
}

function extractTitle(summary: string): string {
  const firstSentence = summary.split(/[.!?]/)[0]?.trim() || "";

  // If first sentence is short enough, use it
  if (firstSentence.length <= 60) {
    return firstSentence;
  }

  // Try to cut at a natural word boundary with more generous limits
  const maxLength = 55;
  const truncated = firstSentence.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > maxLength * 0.6) {
    return truncated.substring(0, lastSpace) + "...";
  }

  // Extract more key words if needed
  const words = firstSentence.split(" ").slice(0, 8).join(" ");
  if (words.length <= maxLength) {
    return words;
  }

  // Final fallback - force break at space
  const forceBreak = firstSentence.lastIndexOf(" ", maxLength);
  if (forceBreak > 0) {
    return firstSentence.substring(0, forceBreak) + "...";
  }

  return firstSentence.substring(0, maxLength - 3) + "...";
}

export default function InfographicPreview({
  title,
  summary,
  theme = "sunset",
  forExport = false,
}: InfographicPreviewProps) {
  const themeStyles = themes[theme];
  const bulletPoints = extractBulletPoints(summary);
  const displayTitle = title || extractTitle(summary);

  // Export mode: Fixed 1080x1080 pixels
  if (forExport) {
    return (
      <div 
        className="infographic-export"
        style={{ 
          width: 1080, 
          height: 1080,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 32,
        }}
        data-export-ready="true"
      >
        {/* Gradient Background */}
        <div 
          className={`absolute inset-0 bg-gradient-to-br ${themeStyles.bg}`}
          style={{ borderRadius: 32 }}
        />
        
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: 32 }}>
          {/* Large circle */}
          <div
            className={`absolute ${themeStyles.accent}`}
            style={{
              top: -80,
              right: -80,
              width: 320,
              height: 320,
              borderRadius: '50%',
              filter: 'blur(60px)',
            }}
          />
          {/* Small circle */}
          <div
            className={`absolute ${themeStyles.accent}`}
            style={{
              bottom: -40,
              left: -40,
              width: 240,
              height: 240,
              borderRadius: '50%',
              filter: 'blur(40px)',
            }}
          />
          {/* Grid pattern */}
          <div
            className="absolute inset-0"
            style={{
              opacity: 0.08,
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1.5px, transparent 0)`,
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        {/* Content */}
        <div 
          className="relative z-10 h-full flex flex-col"
          style={{ padding: 72 }}
        >
          {/* Top decoration */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
            <div 
              className={themeStyles.bullet}
              style={{ width: 48, height: 6, borderRadius: 999 }}
            />
            <div 
              className={themeStyles.bullet}
              style={{ width: 20, height: 6, borderRadius: 999, opacity: 0.6 }}
            />
            <div 
              className={themeStyles.bullet}
              style={{ width: 10, height: 6, borderRadius: 999, opacity: 0.4 }}
            />
          </div>

          {/* Title */}
          <h2
            className={themeStyles.text}
            style={{ 
              fontFamily: "var(--font-syne), system-ui, sans-serif",
              fontSize: 56,
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: 56,
              letterSpacing: '-0.02em',
            }}
          >
            {displayTitle}
          </h2>

          {/* Bullet points */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28 }}>
            {bulletPoints.map((point, index) => (
              <div
                key={index}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}
              >
                {/* Bullet */}
                <div style={{ flexShrink: 0, marginTop: 14 }}>
                  <div
                    className={themeStyles.bullet}
                    style={{ width: 14, height: 14, borderRadius: '50%' }}
                  />
                </div>
                {/* Text */}
                <p
                  className={themeStyles.text}
                  style={{ 
                    fontSize: 28,
                    lineHeight: 1.5,
                    opacity: 0.95,
                    fontWeight: 400,
                  }}
                >
                  {point}
                </p>
              </div>
            ))}
          </div>

          {/* Branding */}
          <div style={{ marginTop: 'auto', paddingTop: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Logo mark */}
                <div 
                  style={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: 10, 
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span
                  className={themeStyles.cta}
                  style={{ fontSize: 18, fontWeight: 500 }}
                >
                  Created with Blog2Visuals
                </span>
              </div>
              
              {/* Arrow decoration */}
              <div className={themeStyles.text} style={{ opacity: 0.5 }}>
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Display mode: Responsive sizing
  return (
    <div className="w-full aspect-square max-w-[320px] sm:max-w-[380px] md:max-w-[440px] lg:max-w-[500px] xl:max-w-[560px] mx-auto">
      {/* Main container - 1:1 ratio */}
      <div
        className={`
          relative w-full h-full rounded-2xl overflow-hidden
          bg-gradient-to-br ${themeStyles.bg}
          shadow-2xl
        `}
      >
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Large circle */}
          <div
            className={`absolute -top-[15%] -right-[15%] w-[40%] h-[40%] rounded-full ${themeStyles.accent} blur-3xl`}
          />
          {/* Small circle */}
          <div
            className={`absolute -bottom-[10%] -left-[10%] w-[30%] h-[30%] rounded-full ${themeStyles.accent} blur-2xl`}
          />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: "24px 24px",
            }}
          />
        </div>

        {/* Content - responsive sizing with viewport-based units */}
        <div className="relative z-10 h-full flex flex-col p-[5%] sm:p-[6%] md:p-[7%]">
          {/* Top decoration - smaller spacing */}
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-5">
            <div className={`w-8 sm:w-10 md:w-12 h-0.5 sm:h-1 rounded-full ${themeStyles.bullet}`} />
            <div className={`w-4 sm:w-5 md:w-6 h-0.5 sm:h-1 rounded-full ${themeStyles.bullet} opacity-60`} />
            <div className={`w-2 sm:w-2.5 md:w-3 h-0.5 sm:h-1 rounded-full ${themeStyles.bullet} opacity-40`} />
          </div>

          {/* Title - responsive font size with better line height */}
          <div className="mb-3 sm:mb-4 md:mb-5">
            <h2
              className={`
                text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl
                font-extrabold leading-tight
                ${themeStyles.text} tracking-tight
              `}
              style={{
                fontFamily: "var(--font-syne), sans-serif",
                lineHeight: 1.1,
              }}
            >
              {displayTitle}
            </h2>
          </div>

          {/* Bullet points - improved layout with better spacing */}
          <div className="flex-1 flex flex-col justify-start gap-2 sm:gap-3 md:gap-4" style={{ minHeight: 0 }}>
            {bulletPoints.map((point, index) => (
              <div
                key={index}
                className="flex items-start gap-2 sm:gap-3"
              >
                {/* Bullet - fixed size for consistency */}
                <div className="flex-shrink-0 mt-1 sm:mt-1.5">
                  <div
                    className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${themeStyles.bullet}`}
                  />
                </div>
                {/* Text - responsive with better wrapping */}
                <p
                  className={`
                    text-xs sm:text-sm md:text-base lg:text-lg leading-snug
                    ${themeStyles.text} opacity-95 flex-1
                  `}
                  style={{
                    fontWeight: 400,
                    lineHeight: 1.4,
                    wordBreak: 'break-word',
                    hyphens: 'auto',
                  }}
                >
                  {point}
                </p>
              </div>
            ))}
          </div>

          {/* Branding - reduced spacing */}
          <div className="mt-auto pt-3 sm:pt-4 md:pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Logo mark */}
                <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-md bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-3 h-3 sm:w-4 sm:h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <span
                  className={`text-[10px] sm:text-xs md:text-sm font-medium ${themeStyles.cta} leading-none`}
                >
                  Created with Blog2Visuals
                </span>
              </div>

              {/* Arrow */}
              <div className={`${themeStyles.text} opacity-50`}>
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

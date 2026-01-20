"use client";

interface InfographicPreviewProps {
  title?: string;
  summary: string;
  theme?: "sunset" | "ocean" | "forest" | "purple" | "midnight";
}

const themes = {
  sunset: {
    bg: "from-orange-600 via-rose-500 to-purple-600",
    accent: "bg-white/20",
    text: "text-white",
    bullet: "bg-amber-300",
    cta: "text-white/70",
  },
  ocean: {
    bg: "from-cyan-500 via-blue-600 to-indigo-700",
    accent: "bg-white/20",
    text: "text-white",
    bullet: "bg-cyan-300",
    cta: "text-white/70",
  },
  forest: {
    bg: "from-emerald-500 via-green-600 to-teal-700",
    accent: "bg-white/20",
    text: "text-white",
    bullet: "bg-emerald-300",
    cta: "text-white/70",
  },
  purple: {
    bg: "from-violet-600 via-purple-600 to-fuchsia-600",
    accent: "bg-white/20",
    text: "text-white",
    bullet: "bg-violet-300",
    cta: "text-white/70",
  },
  midnight: {
    bg: "from-slate-900 via-zinc-800 to-neutral-900",
    accent: "bg-white/10",
    text: "text-white",
    bullet: "bg-orange-400",
    cta: "text-white/50",
  },
};

function extractBulletPoints(summary: string): string[] {
  // Split by sentences and clean up
  const sentences = summary
    .replace(/([.!?])\s+/g, "$1|")
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  // Take up to 4 key points
  const points: string[] = [];
  for (let i = 0; i < Math.min(sentences.length, 4); i++) {
    let point = sentences[i];
    // Remove trailing period for cleaner look
    if (point.endsWith(".")) {
      point = point.slice(0, -1);
    }
    // Truncate at word boundary if too long (increased limit to 120)
    const maxLength = 120;
    if (point.length > maxLength) {
      // Find the last space before the limit
      const lastSpace = point.lastIndexOf(" ", maxLength);
      if (lastSpace > maxLength * 0.6) {
        // Use word boundary if it's not too far back
        point = point.substring(0, lastSpace) + "...";
      } else {
        // Fallback: try to end at a comma or other natural break
        const breakChars = [",", ";", ":", "-"];
        let bestBreak = -1;
        for (const char of breakChars) {
          const pos = point.lastIndexOf(char, maxLength);
          if (pos > bestBreak && pos > maxLength * 0.5) {
            bestBreak = pos;
          }
        }
        if (bestBreak > 0) {
          point = point.substring(0, bestBreak) + "...";
        } else {
          // Last resort: cut at word boundary
          point = point.substring(0, maxLength - 3).trimEnd() + "...";
        }
      }
    }
    points.push(point);
  }

  return points;
}

function extractTitle(summary: string): string {
  // Try to create a compelling title from the summary
  const firstSentence = summary.split(/[.!?]/)[0]?.trim() || "";
  
  // If first sentence is short enough, use it (increased limit to 60)
  if (firstSentence.length <= 60) {
    return firstSentence;
  }
  
  // Try to cut at a natural word boundary
  const maxLength = 55;
  const truncated = firstSentence.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  
  if (lastSpace > maxLength * 0.6) {
    return truncated.substring(0, lastSpace) + "...";
  }
  
  // Otherwise, extract key words (increased to 8 words)
  const words = firstSentence.split(" ").slice(0, 8).join(" ");
  return words + "...";
}

export default function InfographicPreview({
  title,
  summary,
  theme = "sunset",
}: InfographicPreviewProps) {
  const themeStyles = themes[theme];
  const bulletPoints = extractBulletPoints(summary);
  const displayTitle = title || extractTitle(summary);

  return (
    <div className="w-full aspect-square max-w-[280px] sm:max-w-[400px] md:max-w-[480px] lg:max-w-[540px] mx-auto">
      {/* Main container - 1:1 ratio, responsive sizing */}
      <div
        className={`
          relative w-full h-full rounded-xl sm:rounded-2xl overflow-hidden
          bg-gradient-to-br ${themeStyles.bg}
          shadow-xl sm:shadow-2xl
        `}
      >
        {/* Decorative elements - scaled for mobile */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Large circle - smaller on mobile */}
          <div
            className={`absolute -top-10 sm:-top-20 -right-10 sm:-right-20 w-32 sm:w-48 md:w-64 h-32 sm:h-48 md:h-64 rounded-full ${themeStyles.accent} blur-2xl sm:blur-3xl`}
          />
          {/* Small circle - smaller on mobile */}
          <div
            className={`absolute -bottom-5 sm:-bottom-10 -left-5 sm:-left-10 w-24 sm:w-36 md:w-48 h-24 sm:h-36 md:h-48 rounded-full ${themeStyles.accent} blur-xl sm:blur-2xl`}
          />
          {/* Grid pattern overlay - smaller grid on mobile */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: "16px 16px",
            }}
          />
        </div>

        {/* Content - responsive padding */}
        <div className="relative z-10 h-full flex flex-col p-4 sm:p-6 md:p-8 lg:p-10">
          {/* Top decoration - smaller on mobile */}
          <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 md:mb-6">
            <div className={`w-5 sm:w-6 md:w-8 h-0.5 sm:h-1 rounded-full ${themeStyles.bullet}`} />
            <div className={`w-2 sm:w-2.5 md:w-3 h-0.5 sm:h-1 rounded-full ${themeStyles.bullet} opacity-60`} />
            <div className={`w-1 sm:w-1.5 h-0.5 sm:h-1 rounded-full ${themeStyles.bullet} opacity-40`} />
          </div>

          {/* Title - responsive text sizes */}
          <h2
            className={`
              text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-extrabold leading-tight
              ${themeStyles.text} mb-4 sm:mb-6 md:mb-8
            `}
            style={{ fontFamily: "var(--font-syne), sans-serif" }}
          >
            {displayTitle}
          </h2>

          {/* Bullet points - responsive spacing */}
          <div className="flex-1 flex flex-col justify-center space-y-2 sm:space-y-3 md:space-y-4">
            {bulletPoints.map((point, index) => (
              <div
                key={index}
                className="flex items-start gap-2 sm:gap-2.5 md:gap-3 animate-fade-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Bullet - responsive size */}
                <div className="flex-shrink-0 mt-1 sm:mt-1.5 md:mt-2">
                  <div
                    className={`w-1.5 sm:w-2 md:w-2.5 h-1.5 sm:h-2 md:h-2.5 rounded-full ${themeStyles.bullet}`}
                  />
                </div>
                {/* Text - responsive font size */}
                <p
                  className={`
                    text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed
                    ${themeStyles.text} opacity-95
                  `}
                >
                  {point}
                </p>
              </div>
            ))}
          </div>

          {/* CTA / Branding - responsive sizing */}
          <div className="mt-auto pt-3 sm:pt-4 md:pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Logo mark - responsive */}
                <div className="w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6 rounded sm:rounded-lg bg-white/20 flex items-center justify-center">
                  <svg
                    className="w-2.5 sm:w-3 md:w-3.5 h-2.5 sm:h-3 md:h-3.5 text-white"
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
                  className={`text-[10px] sm:text-xs md:text-sm font-medium ${themeStyles.cta}`}
                >
                  Created with Blog2Visuals
                </span>
              </div>
              
              {/* Decorative arrow - hide on very small screens */}
              <div className={`${themeStyles.text} opacity-50 hidden sm:block`}>
                <svg
                  className="w-4 md:w-5 h-4 md:h-5"
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

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
    // Truncate if too long
    if (point.length > 80) {
      point = point.substring(0, 77) + "...";
    }
    points.push(point);
  }

  return points;
}

function extractTitle(summary: string): string {
  // Try to create a compelling title from the summary
  const firstSentence = summary.split(/[.!?]/)[0]?.trim() || "";
  
  // If first sentence is short enough, use it
  if (firstSentence.length <= 50) {
    return firstSentence;
  }
  
  // Otherwise, extract key words
  const words = firstSentence.split(" ").slice(0, 6).join(" ");
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
    <div className="w-full aspect-square max-w-[540px] mx-auto">
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
            className={`absolute -top-20 -right-20 w-64 h-64 rounded-full ${themeStyles.accent} blur-3xl`}
          />
          {/* Small circle */}
          <div
            className={`absolute -bottom-10 -left-10 w-48 h-48 rounded-full ${themeStyles.accent} blur-2xl`}
          />
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: "24px 24px",
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col p-8 md:p-10">
          {/* Top decoration */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`w-8 h-1 rounded-full ${themeStyles.bullet}`} />
            <div className={`w-3 h-1 rounded-full ${themeStyles.bullet} opacity-60`} />
            <div className={`w-1.5 h-1 rounded-full ${themeStyles.bullet} opacity-40`} />
          </div>

          {/* Title */}
          <h2
            className={`
              text-2xl md:text-3xl lg:text-4xl font-extrabold leading-tight
              ${themeStyles.text} mb-8
            `}
            style={{ fontFamily: "var(--font-syne), sans-serif" }}
          >
            {displayTitle}
          </h2>

          {/* Bullet points */}
          <div className="flex-1 flex flex-col justify-center space-y-4">
            {bulletPoints.map((point, index) => (
              <div
                key={index}
                className="flex items-start gap-3 animate-fade-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Bullet */}
                <div className="flex-shrink-0 mt-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${themeStyles.bullet}`}
                  />
                </div>
                {/* Text */}
                <p
                  className={`
                    text-base md:text-lg leading-relaxed
                    ${themeStyles.text} opacity-95
                  `}
                >
                  {point}
                </p>
              </div>
            ))}
          </div>

          {/* CTA / Branding */}
          <div className="mt-auto pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Logo mark */}
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                  <svg
                    className="w-3.5 h-3.5 text-white"
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
                  className={`text-sm font-medium ${themeStyles.cta}`}
                >
                  Created with Blog2Visuals
                </span>
              </div>
              
              {/* Decorative arrow */}
              <div className={`${themeStyles.text} opacity-50`}>
                <svg
                  className="w-5 h-5"
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

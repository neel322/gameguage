import React from 'react';

interface GaugeSpeedometerProps {
  score: number; // 0 to 100
  size?: number;
  tier: string;
}

export const GaugeSpeedometer: React.FC<GaugeSpeedometerProps> = ({ score, size = 200, tier }) => {
  // Angle maps from -110 deg to +110 deg
  const clampedScore = Math.max(0, Math.min(100, score));
  const angle = -110 + (clampedScore / 100) * 220;

  // Determine color theme based on score
  let strokeColor = '#ef4444'; // Red
  let glowColor = 'rgba(239, 68, 68, 0.4)';
  if (clampedScore >= 85) {
    strokeColor = '#00f2fe'; // Cyan / Flagship
    glowColor = 'rgba(0, 242, 254, 0.5)';
  } else if (clampedScore >= 65) {
    strokeColor = '#10b981'; // Green
    glowColor = 'rgba(16, 185, 129, 0.5)';
  } else if (clampedScore >= 45) {
    strokeColor = '#f59e0b'; // Amber
    glowColor = 'rgba(245, 158, 11, 0.5)';
  }

  return (
    <div className="flex flex-col items-center justify-center relative">
      <svg width={size} height={size * 0.75} viewBox="0 0 200 150" className="overflow-visible">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="35%" stopColor="#f59e0b" />
            <stop offset="65%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#00f2fe" />
          </linearGradient>
          <filter id="gaugeGlow">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={strokeColor} floodOpacity="0.6" />
          </filter>
        </defs>

        {/* Background Arc */}
        <path
          d="M 25 130 A 75 75 0 1 1 175 130"
          fill="none"
          stroke="#1e293b"
          strokeWidth="14"
          strokeLinecap="round"
        />

        {/* Colored Gradient Arc */}
        <path
          d="M 25 130 A 75 75 0 1 1 175 130"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="14"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Needle */}
        <g transform={`rotate(${angle} 100 130)`} className="transition-transform duration-700 ease-out">
          <line
            x1="100"
            y1="130"
            x2="100"
            y2="50"
            stroke="#ffffff"
            strokeWidth="3.5"
            strokeLinecap="round"
            filter="url(#gaugeGlow)"
          />
          <polygon points="97,52 103,52 100,42" fill="#ffffff" />
        </g>

        {/* Center Pivot */}
        <circle cx="100" cy="130" r="9" fill="#0f172a" stroke={strokeColor} strokeWidth="3" />
        <circle cx="100" cy="130" r="4" fill="#ffffff" />
      </svg>

      {/* Score Text */}
      <div className="text-center -mt-6">
        <div 
          className="text-4xl font-extrabold tracking-tight"
          style={{ color: strokeColor, textShadow: `0 0 18px ${glowColor}` }}
        >
          {clampedScore}<span className="text-lg text-slate-400 font-semibold">/100</span>
        </div>
        <div className="text-xs uppercase tracking-wider font-bold text-slate-400 mt-1">
          {tier}
        </div>
      </div>
    </div>
  );
};

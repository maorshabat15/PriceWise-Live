import React from 'react';

interface PriceWiseLogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'icon';
  theme?: 'dark' | 'light' | 'auto';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
}

export const PriceWiseLogo: React.FC<PriceWiseLogoProps> = ({
  className = '',
  variant = 'compact',
  theme = 'auto',
  size = 'md',
  showTagline = false,
}) => {
  // Dimension scales
  const sizeMap = {
    sm: { height: 28, iconSize: 28 },
    md: { height: 36, iconSize: 34 },
    lg: { height: 48, iconSize: 44 },
    xl: { height: 64, iconSize: 58 },
  };

  const { height, iconSize } = sizeMap[size];

  // Dynamic colors depending on theme
  const navyColor = theme === 'light' ? '#0f2b48' : theme === 'dark' ? '#ffffff' : 'currentColor';
  const tealColor = '#0d9488'; // Brand teal from logo

  // Icon only rendering
  if (variant === 'icon') {
    return (
      <svg
        viewBox="0 0 170 185"
        style={{ height: iconSize, width: 'auto' }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        aria-label="PriceWise Logo"
      >
        {/* Wheels */}
        <circle cx="58" cy="165" r="10" stroke={tealColor} strokeWidth="6" fill="white" />
        <circle cx="118" cy="165" r="10" stroke={tealColor} strokeWidth="6" fill="white" />

        {/* Axle */}
        <path d="M 46 142 L 130 142" stroke={navyColor} strokeWidth="6" strokeLinecap="round" />

        {/* P handle & frame */}
        <path
          d="M 10 24 L 32 24 C 38 24 42 28 44 34 L 54 100 L 140 90"
          stroke={navyColor}
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* P Loop */}
        <path
          d="M 16 64 L 46 64 C 62 64 66 88 48 92 L 16 92 Z"
          stroke={navyColor}
          strokeWidth="6"
          strokeLinejoin="round"
          fill="none"
        />

        {/* W & Rising Arrow (Teal) */}
        <path
          d="M 38 72 L 56 126 L 80 82 L 104 126 L 148 32"
          stroke={tealColor}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Arrowhead */}
        <path
          d="M 124 26 L 154 28 L 150 58 Z"
          fill={tealColor}
          stroke={tealColor}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Full or Compact logo
  return (
    <div
      className={`inline-flex items-center gap-2 select-none ${className}`}
      style={{ height }}
      dir="ltr"
    >
      {/* Brand Icon */}
      <svg
        viewBox="0 0 170 185"
        style={{ height, width: 'auto' }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden="true"
      >
        {/* Wheels */}
        <circle cx="58" cy="165" r="10" stroke={tealColor} strokeWidth="6" fill="white" />
        <circle cx="118" cy="165" r="10" stroke={tealColor} strokeWidth="6" fill="white" />

        {/* Axle */}
        <path d="M 46 142 L 130 142" stroke={navyColor} strokeWidth="6" strokeLinecap="round" />

        {/* P handle & frame */}
        <path
          d="M 10 24 L 32 24 C 38 24 42 28 44 34 L 54 100 L 140 90"
          stroke={navyColor}
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* P Loop */}
        <path
          d="M 16 64 L 46 64 C 62 64 66 88 48 92 L 16 92 Z"
          stroke={navyColor}
          strokeWidth="6"
          strokeLinejoin="round"
          fill="none"
        />

        {/* W & Rising Arrow (Teal) */}
        <path
          d="M 38 72 L 56 126 L 80 82 L 104 126 L 148 32"
          stroke={tealColor}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Arrowhead */}
        <path
          d="M 124 26 L 154 28 L 150 58 Z"
          fill={tealColor}
          stroke={tealColor}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>

      {/* Typography */}
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-center gap-1.5">
          <span
            className="font-extrabold tracking-tight"
            style={{
              fontSize: size === 'sm' ? '1.1rem' : size === 'lg' ? '1.6rem' : size === 'xl' ? '2.1rem' : '1.3rem',
              color: navyColor,
            }}
          >
            PriceWise
          </span>
        </div>

        {(variant === 'full' || showTagline) && (
          <div
            className="font-bold flex flex-col text-right leading-tight mt-0.5"
            dir="rtl"
            style={{
              fontSize: size === 'sm' ? '0.65rem' : size === 'lg' ? '0.85rem' : size === 'xl' ? '1rem' : '0.72rem',
              color: theme === 'light' ? '#0f2b48' : theme === 'dark' ? '#94a3b8' : '#0d9488',
            }}
          >
            <span>חיסכון משתלם</span>
            <span className="text-[90%] opacity-90">זה אנחנו.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceWiseLogo;

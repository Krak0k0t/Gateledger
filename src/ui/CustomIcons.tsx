import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function CalendarAlertIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="4.5" width="18" height="16.5" rx="2" />
      <path d="M8 2.5v3M16 2.5v3M3 9.5h18" />
      <path d="M12 12.2v3.3" strokeWidth="2.3" />
      <circle cx="12" cy="18" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CharterSealIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M19 4H7a2 2 0 0 0-2 2v12a2 2 0 0 1-2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 1 2-2z" />
      <path d="M9 9h6M9 13h4" />
      <polygon points="15,15.5 16.5,17 15,18.5 13.5,17" fill="#F4B942" stroke="none" />
    </svg>
  );
}

export function CodexTomeIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v17H6.5A2.5 2.5 0 0 0 4 22V5.5z" />
      <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v17h5.5A2.5 2.5 0 0 1 20 22V5.5z" />
      <path d="M7.5 8h2M7.5 11.5h2M14.5 8h2" />
    </svg>
  );
}

export function SatchelPackIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M9 6V4.5A2.5 2.5 0 0 1 11.5 2h1A2.5 2.5 0 0 1 15 4.5V6" />
      <path d="M5 8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8z" />
      <path d="M5 11.5h14" />
      <path d="M10.5 11.5v2.5h3v-2.5" stroke="#F4B942" />
    </svg>
  );
}

export function SettingsCogIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v2.1M12 19.1v2.1M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M2.8 12h2.1M19.1 12h2.1M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5" />
    </svg>
  );
}

export function GlobeRuneIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3.5 9.5h17M3.5 14.5h17" />
    </svg>
  );
}

export function SpeakerOnIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <polygon points="11 5 6 9 3 9 3 15 6 15 11 19 11 5" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  );
}

export function SpeakerOffIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <polygon points="11 5 6 9 3 9 3 15 6 15 11 19 11 5" />
      <path d="M21 9l-6 6M15 9l6 6" stroke="#FF6B81" />
    </svg>
  );
}

export function CameraEyeIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  );
}

export function FullscreenGlyphIcon({ exit = false, className = 'w-4 h-4', ...props }: IconProps & { exit?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {exit ? (
        <>
          <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
        </>
      ) : (
        <>
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        </>
      )}
    </svg>
  );
}

export function PauseGlyphIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <rect x="6" y="5" width="4.2" height="14" rx="1" />
      <rect x="13.8" y="5" width="4.2" height="14" rx="1" />
    </svg>
  );
}

export function GamepadTouchIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="7" width="18" height="10" rx="4" />
      <path d="M8 10v4M6 12h4" />
      <circle cx="15.5" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="17.8" cy="13" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SupplyCompassIcon({ className = 'w-3.5 h-3.5', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <polygon points="15.5,8.5 13.4,13.4 8.5,15.5 10.6,10.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FlameEmberIcon({ className = 'w-3.5 h-3.5', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3c2.4 2.8 5 5.4 5 9a5 5 0 1 1-10 0c0-2.1 1.1-4.1 2.3-5.6.2 1.5 1.1 2.6 2.2 2.6.5-2 .4-3.9-.5-6z" />
    </svg>
  );
}

export function BoltSparkIcon({ className = 'w-3.5 h-3.5', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M13 2L4.5 13.5h6.2L9.5 22l9.5-12h-6.2L13 2z" />
    </svg>
  );
}

export function ShieldAegisIcon({ className = 'w-3.5 h-3.5', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3l7 3v5.5c0 4.5-3 8.2-7 9.5-4-1.3-7-5-7-9.5V6l7-3z" />
    </svg>
  );
}

export function StarCrestIcon({ className = 'w-3.5 h-3.5', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <polygon points="12,2.5 14.8,8.5 21.4,9.3 16.5,13.8 17.8,20.4 12,17.1 6.2,20.4 7.5,13.8 2.6,9.3 9.2,8.5" />
    </svg>
  );
}

export function SparkleGlyphIcon({ className = 'w-3.5 h-3.5', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M12 2l2.3 7.7L22 12l-7.7 2.3L12 22l-2.3-7.7L2 12l7.7-2.3L12 2z" />
    </svg>
  );
}

export function SnowflakeGlyphIcon({ className = 'w-3.5 h-3.5', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M12 2v20M3.5 7l17 10M20.5 7l-17 10" />
    </svg>
  );
}

export function SkullBossIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3a7 7 0 0 0-7 7c0 2.5 1.3 4.6 3.2 5.8V19h7.6v-3.2C17.7 14.6 19 12.5 19 10a7 7 0 0 0-7-7z" />
      <circle cx="9.2" cy="10.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="10.5" r="1.3" fill="currentColor" stroke="none" />
      <path d="M10.5 19v-2M13.5 19v-2" />
    </svg>
  );
}

export function JumpWingIcon({ className = 'w-3.5 h-3.5', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M12 18V5M7 10l5-5 5 5M5 20h14" />
    </svg>
  );
}

export function TrophyCrestIcon({ className = 'w-4 h-4', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M7 4h10v6a5 5 0 0 1-10 0V4z" />
      <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />
      <path d="M12 15v4M8 20h8" />
    </svg>
  );
}

export function WarningTriangleIcon({ className = 'w-3.5 h-3.5', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3L2.5 20h19L12 3z" />
      <path d="M12 9.5v4.5M12 17h.01" />
    </svg>
  );
}

export function CheckRuneIcon({ className = 'w-3.5 h-3.5', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

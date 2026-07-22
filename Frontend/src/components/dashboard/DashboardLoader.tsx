// Recolored Exofe-brand version of a Uiverse.io loader by SelfMadeSystem
// (https://uiverse.io/SelfMadeSystem). The original animation traces out
// the letters Y-O-U with a stroke draw-in effect plus a spinning ring for
// the O; this keeps the exact same draw-in/spin animations but the glyphs
// are redrawn to spell E-X-O-F-E instead, with the O staying the spinning
// ring in the middle. Shown while the dashboard layout is checking
// auth/trial status on mount.
const LETTER_VIEWBOX = "0 0 64 64";

function DashLetter({ d, gradientId }: { d: string; gradientId: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox={LETTER_VIEWBOX} height="64" width="64" className="inline-block">
      <path
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeWidth="8"
        stroke={`url(#${gradientId})`}
        d={d}
        className="exofe-loader-dash"
        pathLength={360}
      />
    </svg>
  );
}

export default function DashboardLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <svg height="0" width="0" viewBox="0 0 64 64" className="absolute">
        <defs>
          <linearGradient gradientUnits="userSpaceOnUse" y2="2" x2="0" y1="62" x1="0" id="exofe-loader-a">
            <stop stopColor="#5B4FE9" />
            <stop stopColor="#7C6FF5" offset="1" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" y2="0" x2="0" y1="64" x1="0" id="exofe-loader-b">
            <stop stopColor="#fcba03" />
            <stop stopColor="#5B4FE9" offset="1" />
            <animateTransform
              repeatCount="indefinite"
              keySplines=".42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1"
              keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1"
              dur="8s"
              values="0 32 32;-270 32 32;-270 32 32;-540 32 32;-540 32 32;-810 32 32;-810 32 32;-1080 32 32;-1080 32 32"
              type="rotate"
              attributeName="gradientTransform"
            />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" y2="2" x2="0" y1="62" x1="0" id="exofe-loader-c">
            <stop stopColor="#7C6FF5" />
            <stop stopColor="#fcba03" offset="1" />
          </linearGradient>
        </defs>
      </svg>

      <div className="flex items-center">
        {/* E */}
        <DashLetter gradientId="exofe-loader-a" d="M 12 8 L 12 56 M 12 8 L 52 8 M 12 32 L 46 32 M 12 56 L 52 56" />
        {/* X */}
        <DashLetter gradientId="exofe-loader-c" d="M 10 8 L 54 56 M 54 8 L 10 56" />
        {/* O — the original spinning ring, kept exactly as-is */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox={LETTER_VIEWBOX} height="64" width="64" className="inline-block">
          <path
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeWidth="10"
            stroke="url(#exofe-loader-b)"
            d="M 32 32 m 0 -27 a 27 27 0 1 1 0 54 a 27 27 0 1 1 0 -54"
            className="exofe-loader-spin"
            pathLength={360}
          />
        </svg>
        {/* F */}
        <DashLetter gradientId="exofe-loader-a" d="M 12 8 L 12 56 M 12 8 L 52 8 M 12 32 L 46 32" />
        {/* E */}
        <DashLetter gradientId="exofe-loader-c" d="M 12 8 L 12 56 M 12 8 L 52 8 M 12 32 L 46 32 M 12 56 L 52 56" />
      </div>
    </div>
  );
}

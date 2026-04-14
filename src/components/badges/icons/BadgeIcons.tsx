// Professional hex-medallion gaming badges — 120×120 viewBox, flat-top hexagon
// Inspired by the heater/cold badge aesthetic: layered metallic border, dark inner
// background with radial glow, large glowing icon.

interface IconProps {
  size?: number;
  className?: string;
}

// ── Flat-top hex polygon points (center 60,60) ────────────────────────────────
// vertex_i = (60 + r·cos(i·60°), 60 + r·sin(i·60°)), i = 0..5
const P = {
  r54: '114,60 87,107 33,107 6,60 33,13 87,13',
  r50: '110,60 85,103 35,103 10,60 35,17 85,17',
  r47: '107,60 83.5,101 36.5,101 13,60 36.5,19 83.5,19',
  r44: '104,60 82,98 38,98 16,60 38,22 82,22',
  r41: '101,60 80.5,95.5 39.5,95.5 19,60 39.5,24.5 80.5,24.5',
  r38: '98,60 79,93 41,93 22,60 41,27 79,27',
  r34: '94,60 77,89 43,89 26,60 43,31 77,31',
} as const;

interface HexColors {
  c1: string; // outermost shadow
  c2: string; // main border
  c3: string; // bright highlight band
  c4: string; // inner mid border
  c5: string; // inner shadow edge
  bgA: string; // radial bg centre
  bgB: string; // radial bg mid
  bgC: string; // radial bg edge
  glow: string;
}

const GOLD: HexColors = {
  c1: '#1c0e00', c2: '#b8922e', c3: '#f5e070', c4: '#7a5818', c5: '#2d1800',
  bgA: '#5a3200', bgB: '#1c0e00', bgC: '#060300', glow: '#d4a843',
};
const RED: HexColors = {
  c1: '#160000', c2: '#8b1c1c', c3: '#f87171', c4: '#5a0f0f', c5: '#260000',
  bgA: '#4a0000', bgB: '#160000', bgC: '#050000', glow: '#ef4444',
};
const TEAL: HexColors = {
  c1: '#001414', c2: '#0b6060', c3: '#5eead4', c4: '#074848', c5: '#002020',
  bgA: '#003838', bgB: '#001414', bgC: '#000606', glow: '#2dd4bf',
};
const SILVER: HexColors = {
  c1: '#08080f', c2: '#4b5563', c3: '#e2e8f0', c4: '#374151', c5: '#14171f',
  bgA: '#1e2230', bgB: '#0a0c14', bgC: '#040408', glow: '#cbd5e1',
};
const BLUE: HexColors = {
  c1: '#00060f', c2: '#1e3a8a', c3: '#93c5fd', c4: '#172d6a', c5: '#060e1e',
  bgA: '#0a1f4a', bgB: '#05101e', bgC: '#020508', glow: '#60a5fa',
};

// ── Base hexagonal frame ───────────────────────────────────────────────────────
function HexBadge({
  uid, colors, size, children,
}: {
  uid: string;
  colors: HexColors;
  size: number;
  children: React.ReactNode;
}) {
  const fBlur = `b-${uid}`;
  const fIcon = `ig-${uid}`;
  const gBg   = `bg-${uid}`;

  return (
    <svg viewBox="0 0 120 120" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* outer bloom */}
        <filter id={fBlur} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        {/* icon soft glow */}
        <filter id={fIcon} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* dark inner background */}
        <radialGradient id={gBg} cx="60" cy="48" r="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor={colors.bgA} />
          <stop offset="55%"  stopColor={colors.bgB} />
          <stop offset="100%" stopColor={colors.bgC} />
        </radialGradient>
      </defs>

      {/* outer ambient bloom */}
      <polygon points={P.r54} fill={colors.glow} opacity="0.28" filter={`url(#${fBlur})`} />

      {/* layered metallic border — outside in */}
      <polygon points={P.r54} fill={colors.c1} />
      <polygon points={P.r50} fill={colors.c2} />
      <polygon points={P.r47} fill={colors.c3} />
      <polygon points={P.r44} fill={colors.c4} />
      <polygon points={P.r41} fill={colors.c5} />

      {/* inner background */}
      <polygon points={P.r38} fill={`url(#${gBg})`} />

      {/* icon content with soft bloom */}
      <g filter={`url(#${fIcon})`}>{children}</g>

      {/* hairline inner rim highlight */}
      <polygon points={P.r38} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />
    </svg>
  );
}

// ── 1. HIGH ROLLER — gold bracelet ring with gems ──────────────────────────────
export function HighRollerBadge({ size = 120, className = '' }: IconProps) {
  const gems = Array.from({ length: 6 }, (_, i) => {
    const θ = (i * 60) * Math.PI / 180;
    return { x: 60 + 19 * Math.cos(θ), y: 58 + 19 * Math.sin(θ), rot: i * 60 };
  });

  return (
    <div className={className} style={{ display: 'inline-block' }}>
      <HexBadge uid="hr" colors={GOLD} size={size}>
        {/* ambient glow disc behind ring */}
        <circle cx="60" cy="58" r="26" fill="#d4a843" opacity="0.08" />
        <circle cx="60" cy="58" r="20" fill="#d4a843" opacity="0.1" />

        {/* bracelet ring — three strokes for bevel */}
        <circle cx="60" cy="58" r="19" stroke="#3d2200" strokeWidth="11" />
        <circle cx="60" cy="58" r="19" stroke="#c9a84c" strokeWidth="8" />
        <circle cx="60" cy="58" r="19"
          stroke="#f5e070" strokeWidth="2.5"
          strokeDasharray="13 45" strokeDashoffset="7"
          opacity="0.65" />

        {/* 6 diamond gems seated on the ring */}
        {gems.map(({ x, y, rot }) => (
          <g key={rot} transform={`rotate(${rot},${x},${y})`}>
            {/* gem shadow */}
            <path d={`M${x},${y - 5.5} L${x + 3.8},${y} L${x},${y + 5.5} L${x - 3.8},${y} Z`}
              fill="#3d2200" />
            {/* gem body */}
            <path d={`M${x},${y - 4.8} L${x + 3.2},${y} L${x},${y + 4.8} L${x - 3.2},${y} Z`}
              fill="#f5e070" />
            {/* gem highlight facet */}
            <path d={`M${x},${y - 4.8} L${x + 3.2},${y} L${x},${y - 0.5} Z`}
              fill="rgba(255,255,255,0.45)" />
          </g>
        ))}

        {/* inner ring detail */}
        <circle cx="60" cy="58" r="12.5"
          stroke="#c9a84c" strokeWidth="0.8" opacity="0.35" />
      </HexBadge>
    </div>
  );
}

// ── 2. DONKEY — red, prominent long ears ──────────────────────────────────────
export function DonkeyBadge({ size = 120, className = '' }: IconProps) {
  return (
    <div className={className} style={{ display: 'inline-block' }}>
      <HexBadge uid="dk" colors={RED} size={size}>
        {/* left ear outer */}
        <path d="M46,57 L41,30 Q44,23 49,26 Q52,28 53,33 L54,57 Z" fill="#b91c1c" />
        {/* left ear inner */}
        <path d="M47,54 L43,33 Q45,27 49,29 Q51,30 52,34 L53,54 Z" fill="#fca5a5" opacity="0.5" />

        {/* right ear outer */}
        <path d="M74,57 L79,30 Q76,23 71,26 Q68,28 67,33 L66,57 Z" fill="#b91c1c" />
        {/* right ear inner */}
        <path d="M73,54 L77,33 Q75,27 71,29 Q69,30 68,34 L67,54 Z" fill="#fca5a5" opacity="0.5" />

        {/* head */}
        <path d="M42,55 Q42,44 60,44 Q78,44 78,55 L78,72 Q78,84 60,84 Q42,84 42,72 Z"
          fill="#dc2626" />

        {/* muzzle highlight */}
        <ellipse cx="60" cy="77" rx="13" ry="7.5" fill="#ef4444" />
        <ellipse cx="60" cy="77" rx="10" ry="5.5" fill="#fca5a5" opacity="0.6" />

        {/* nostrils */}
        <ellipse cx="55.5" cy="79" rx="2.2" ry="1.6" fill="#b91c1c" />
        <ellipse cx="64.5" cy="79" rx="2.2" ry="1.6" fill="#b91c1c" />

        {/* eyes */}
        <ellipse cx="51" cy="60" rx="5" ry="4.5" fill="white" opacity="0.95" />
        <ellipse cx="69" cy="60" rx="5" ry="4.5" fill="white" opacity="0.95" />
        <circle cx="52.5" cy="61" r="2.8" fill="#140000" />
        <circle cx="70.5" cy="61" r="2.8" fill="#140000" />
        <circle cx="53.4" cy="60" r="0.9" fill="white" />
        <circle cx="71.4" cy="60" r="0.9" fill="white" />
      </HexBadge>
    </div>
  );
}

// ── 3. SHARK — teal, asymmetric dorsal fin ────────────────────────────────────
export function SharkBadge({ size = 120, className = '' }: IconProps) {
  return (
    <div className={className} style={{ display: 'inline-block' }}>
      <HexBadge uid="sh" colors={TEAL} size={size}>
        {/* underwater fill below water line */}
        <path
          d="M24,70 Q32,66 40,70 Q48,74 56,70 Q64,66 72,70 Q80,74 88,70 Q92,72 96,70 L96,90 L24,90 Z"
          fill="#0d7070" opacity="0.35" />

        {/* fin shadow for depth */}
        <path
          d="M39,72 C40,60 44,46 54,37 C59,33 65,32 69,35 C74,39 78,52 84,72 Z"
          fill="#074848" />

        {/* main dorsal fin */}
        <path
          d="M37,72 C38,59 42,44 52,36 C57,32 63,31 67,34 C73,38 77,51 82,72 Z"
          fill="#2dd4bf" />

        {/* fin highlight — leading edge */}
        <path
          d="M41,70 C42,57 46,44 54,38"
          stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round" />

        {/* fin secondary highlight */}
        <path
          d="M44,68 C46,58 49,48 56,41"
          stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeLinecap="round" />

        {/* water surface line 1 */}
        <path
          d="M24,70 Q32,66 40,70 Q48,74 56,70 Q64,66 72,70 Q80,74 88,70 Q92,72 96,70"
          stroke="#5eead4" strokeWidth="2" strokeLinecap="round" />

        {/* water surface line 2 (lower ripple) */}
        <path
          d="M26,76 Q34,72.5 42,76 Q50,79.5 58,76 Q66,72.5 74,76 Q82,79.5 90,76"
          stroke="#2dd4bf" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
      </HexBadge>
    </div>
  );
}

// ── 4. ATM — red, money-dispensing machine ────────────────────────────────────
export function ATMBadge({ size = 120, className = '' }: IconProps) {
  return (
    <div className={className} style={{ display: 'inline-block' }}>
      <HexBadge uid="atm" colors={RED} size={size}>
        {/* machine body */}
        <rect x="34" y="30" width="52" height="54" rx="5"
          fill="#1a0000" stroke="#7f1d1d" strokeWidth="1.5" />

        {/* screen bezel */}
        <rect x="40" y="36" width="40" height="26" rx="3" fill="#0d0000" />
        {/* screen glow */}
        <rect x="41" y="37" width="38" height="24" rx="2.5"
          fill="#ef4444" opacity="0.14" />
        {/* screen border */}
        <rect x="40" y="36" width="40" height="26" rx="3"
          fill="none" stroke="#ef4444" strokeWidth="0.8" />

        {/* DOWN ARROW on screen — money leaving */}
        <line x1="60" y1="41" x2="60" y2="52"
          stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
        <polyline points="54,49 60,55.5 66,49"
          stroke="#ef4444" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* dollar signs flanking arrow */}
        <text x="46" y="53" fill="#ef4444" fontSize="8" fontWeight="bold" opacity="0.6">$</text>
        <text x="70" y="53" fill="#ef4444" fontSize="8" fontWeight="bold" opacity="0.6">$</text>

        {/* card slot */}
        <rect x="40" y="66" width="22" height="3.5" rx="1.75"
          fill="#2d0000" stroke="#ef4444" strokeWidth="0.8" />

        {/* keypad dots — 3×2 */}
        {[0, 1, 2].map(c =>
          [0, 1].map(r => (
            <circle key={`${c}-${r}`}
              cx={70 + c * 5} cy={67.5 + r * 5}
              r="1.6"
              fill="#2d0000" stroke="#ef4444" strokeWidth="0.5" opacity="0.8" />
          ))
        )}

        {/* cash dispenser slot */}
        <rect x="40" y="76" width="40" height="5" rx="1.5"
          fill="#0d0000" stroke="#ef4444" strokeWidth="0.8" />
        {/* bills coming out */}
        <rect x="43" y="77.5" width="34" height="1.8" rx="0.9"
          fill="#ef4444" opacity="0.75" />
        <rect x="46" y="79.5" width="28" height="1.5" rx="0.75"
          fill="#ef4444" opacity="0.45" />
      </HexBadge>
    </div>
  );
}

// ── 5. GRINDER — gold, 3-chip stack ───────────────────────────────────────────
export function GrinderBadge({ size = 120, className = '' }: IconProps) {
  // Three chips: top face ellipse + visible front side band
  const chips = [
    { cy: 75, sideColor: '#5a3800', faceOuter: '#c9a84c', faceInner: '#e8cc80', center: '#a07030' },
    { cy: 63, sideColor: '#5a3800', faceOuter: '#c9a84c', faceInner: '#edd890', center: '#b07838' },
    { cy: 51, sideColor: '#5a3800', faceOuter: '#c9a84c', faceInner: '#f5e098', center: '#c08840' },
  ];

  return (
    <div className={className} style={{ display: 'inline-block' }}>
      <HexBadge uid="gr" colors={GOLD} size={size}>
        {chips.map(({ cy, sideColor, faceOuter, faceInner, center }, i) => (
          <g key={i}>
            {/* chip side band (front arc) */}
            <path
              d={`M 36,${cy} A 24,6 0 0,0 84,${cy} L 84,${cy + 7} A 24,6 0 0,1 36,${cy + 7} Z`}
              fill={sideColor}
            />
            {/* chip top face outer ring */}
            <ellipse cx="60" cy={cy} rx="24" ry="6" fill={faceOuter} />
            {/* chip top face inner lighter area */}
            <ellipse cx="60" cy={cy} rx="21" ry="5" fill={faceInner} />
            {/* chip stripe pattern — 4 marks */}
            {[-1, 1].map(side =>
              [0.3, 0.7].map((frac, j) => (
                <ellipse key={`${side}-${j}`}
                  cx={60 + side * 24 * frac} cy={cy}
                  rx="2" ry="1.5"
                  fill={faceOuter} opacity="0.8"
                />
              ))
            )}
            {/* chip center medallion */}
            <ellipse cx="60" cy={cy} rx="9" ry="2.4" fill={center} />
            <ellipse cx="60" cy={cy} rx="9" ry="2.4"
              fill="none" stroke={sideColor} strokeWidth="0.6" />
            {/* chip top edge highlight */}
            <ellipse cx="60" cy={cy} rx="24" ry="6"
              fill="none" stroke="#f5e098" strokeWidth="0.7" opacity="0.5" />
          </g>
        ))}
      </HexBadge>
    </div>
  );
}

// ── 6. DEAD MONEY — silver/gray ghost ─────────────────────────────────────────
export function DeadMoneyBadge({ size = 120, className = '' }: IconProps) {
  return (
    <div className={className} style={{ display: 'inline-block' }}>
      <HexBadge uid="dm" colors={SILVER} size={size}>
        {/* ghost body shadow for depth */}
        <path
          d="M40,82 Q46,70 50,76 Q54,82 58,76 Q60,72 62,76 Q66,82 70,76 Q74,70 80,82 L80,54 Q80,34 60,34 Q40,34 40,54 Z"
          fill="#1e2230" />

        {/* ghost body */}
        <path
          d="M38,80 Q44,68 48,75 Q52,82 56,75 Q58,71 60,71 Q62,71 64,75 Q68,82 72,75 Q76,68 82,80 L82,52 Q82,32 60,32 Q38,32 38,52 Z"
          fill="#6b7280" />

        {/* inner body highlight (lighter area for depth) */}
        <path
          d="M44,75 L44,52 Q44,38 60,38 Q76,38 76,52 L76,75 Q73,68 70,74 Q66,80 63,74 Q60,70 57,74 Q54,80 50,74 Q47,68 44,75 Z"
          fill="#9ca3af" opacity="0.2" />

        {/* left eye socket */}
        <path
          d="M46,56 Q50,50 55,56 Q59,62 55,68 Q50,74 46,68 Q42,62 46,56 Z"
          fill="#0a0c14" />
        {/* left eye glow (spooky blue) */}
        <ellipse cx="50.5" cy="62" rx="3" ry="4.5" fill="#3b82f6" opacity="0.35" />

        {/* right eye socket */}
        <path
          d="M65,56 Q69,50 74,56 Q78,62 74,68 Q69,74 65,68 Q61,62 65,56 Z"
          fill="#0a0c14" />
        {/* right eye glow */}
        <ellipse cx="69.5" cy="62" rx="3" ry="4.5" fill="#3b82f6" opacity="0.35" />
      </HexBadge>
    </div>
  );
}

// ── 7. WHALE — blue frame, gold tail flukes ────────────────────────────────────
export function WhaleBadge({ size = 120, className = '' }: IconProps) {
  return (
    <div className={className} style={{ display: 'inline-block' }}>
      <HexBadge uid="wh" colors={BLUE} size={size}>
        {/* underwater glow beneath water line */}
        <path
          d="M24,73 Q36,69 48,73 Q60,77 72,73 Q84,69 96,73 L96,90 L24,90 Z"
          fill="#1e3a8a" opacity="0.3" />

        {/* left fluke shadow */}
        <path
          d="M62,68 C58,62 44,50 30,38 C26,34 24,28 28,25 C32,22 37,27 38,32 C41,40 50,52 58,62 Z"
          fill="#0c1a3a" />
        {/* right fluke shadow */}
        <path
          d="M58,68 C62,62 76,50 90,38 C94,34 96,28 92,25 C88,22 83,27 82,32 C79,40 70,52 62,62 Z"
          fill="#0c1a3a" />

        {/* left fluke */}
        <path
          d="M60,66 C56,60 42,48 28,36 C24,32 23,26 27,24 C31,21 36,26 37,31 C40,39 49,51 57,61 Z"
          fill="#f5d060" />
        {/* left fluke highlight */}
        <path
          d="M56,61 C50,52 40,43 31,34"
          stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round" />

        {/* right fluke */}
        <path
          d="M60,66 C64,60 78,48 92,36 C96,32 97,26 93,24 C89,21 84,26 83,31 C80,39 71,51 63,61 Z"
          fill="#f5d060" />
        {/* right fluke highlight */}
        <path
          d="M64,61 C70,52 80,43 89,34"
          stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeLinecap="round" />

        {/* tail notch */}
        <path
          d="M55,65 C57,70 63,70 65,65 C63,62 60,61 60,61 C60,61 57,62 55,65 Z"
          fill="#050e24" />

        {/* water surface line 1 */}
        <path
          d="M24,72 Q32,68 40,72 Q48,76 56,72 Q64,68 72,72 Q80,76 88,72 Q92,74 96,72"
          stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" />
        {/* water ripple 2 */}
        <path
          d="M26,79 Q34,75.5 42,79 Q50,82.5 58,79 Q66,75.5 74,79 Q82,82.5 90,79"
          stroke="#60a5fa" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      </HexBadge>
    </div>
  );
}

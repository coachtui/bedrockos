"use client";

// ─────────────────────────────────────────────────────────────
// BedrockGrid — structural node logo lockup
//
// Geometry is rebuilt from the reference SVG in a 920×260
// coordinate space. viewBox is cropped per variant so every
// size variant renders cleanly without clipping or dead space.
// ─────────────────────────────────────────────────────────────

interface BedrockGridProps {
  size?:    "sm" | "md" | "lg";
  variant?: "full" | "icon" | "wordmark";
  className?: string;
}

// ── viewBox per variant ────────────────────────────────────
// "full"     → entire 920×260 lockup
// "icon"     → cropped to just the grid mark (62,42 → 254,234 = 192×192)
// "wordmark" → cropped to just the text block (295,45 → 920,230 = 625×185)
const VIEW_BOXES = {
  full:     "0 0 920 260",
  icon:     "62 42 192 192",
  wordmark: "295 45 625 185",
} as const;

// ── Rendered pixel dimensions per variant × size ───────────
const DIMS: Record<string, Record<string, [number, number]>> = {
  full:     { sm: [300,  85], md: [560, 158], lg: [920, 260] },
  icon:     { sm: [40,   40], md: [64,   64], lg: [120, 120] },
  wordmark: { sm: [260,  78], md: [430, 128], lg: [625, 185] },
};

// ── Shared style fragments ─────────────────────────────────
const gridLineStyle  = { stroke: "var(--color-surface-border)", strokeWidth: 2, opacity: 0.95 } as const;
const innerLineStyle = { stroke: "var(--color-surface-border-hover)", strokeWidth: 1.4, opacity: 0.82 } as const;
const goldLineStyle  = { stroke: "var(--color-gold)", strokeWidth: 2 } as const;

export function BedrockGrid({
  size    = "md",
  variant = "full",
  className = "",
}: BedrockGridProps) {
  const [w, h] = DIMS[variant][size];

  return (
    <svg
      viewBox={VIEW_BOXES[variant]}
      width={w}
      height={h}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="BedrockOS"
      className={className}
    >
      {/* ── Grid icon mark ─────────────────────────────── */}
      {/* All coordinates are local to translate(56, 36).  */}
      {/* Icon spans x 62→254, y 42→234 in SVG space.     */}
      {variant !== "wordmark" && (
        <g transform="translate(56 36)">

          {/* Outer grid border */}
          <rect x={34} y={34} width={136} height={136} style={gridLineStyle} />

          {/* Interior grid subdivisions (thirds) */}
          <line x1={79.33}  y1={34}  x2={79.33}  y2={170} style={innerLineStyle} />
          <line x1={124.66} y1={34}  x2={124.66} y2={170} style={innerLineStyle} />
          <line x1={34}     y1={79.33}  x2={170} y2={79.33}  style={innerLineStyle} />
          <line x1={34}     y1={124.66} x2={170} y2={124.66} style={innerLineStyle} />

          {/* Gold center-axis alignment marks (cross-hair beyond grid) */}
          <line x1={102} y1={6}   x2={102} y2={34}  style={goldLineStyle} />
          <line x1={102} y1={170} x2={102} y2={198} style={goldLineStyle} />
          <line x1={6}   y1={102} x2={34}  y2={102} style={goldLineStyle} />
          <line x1={170} y1={102} x2={198} y2={102} style={goldLineStyle} />

          {/* Center operational core — gold ring over dark fill */}
          <rect
            x={72} y={72} width={60} height={60}
            style={{ stroke: "var(--color-gold)", strokeWidth: 3, fill: "var(--color-surface-base, #0B0B0D)" }}
          />

          {/* Center gold node */}
          <rect x={94} y={94} width={16} height={16} style={{ fill: "var(--color-gold)" }} />

          {/* Corner survey control nodes (16×16, lighter gray) */}
          <rect x={26}  y={26}  width={16} height={16} style={{ fill: "#A7A7B4" }} />
          <rect x={162} y={26}  width={16} height={16} style={{ fill: "#A7A7B4" }} />
          <rect x={26}  y={162} width={16} height={16} style={{ fill: "#A7A7B4" }} />
          <rect x={162} y={162} width={16} height={16} style={{ fill: "#A7A7B4" }} />

          {/* Mid-edge nodes — top & bottom, vertical orientation (10×16) */}
          <rect x={74}  y={26}  width={10} height={16} style={{ fill: "#6E6E7C" }} />
          <rect x={120} y={26}  width={10} height={16} style={{ fill: "#6E6E7C" }} />
          <rect x={74}  y={162} width={10} height={16} style={{ fill: "#6E6E7C" }} />
          <rect x={120} y={162} width={10} height={16} style={{ fill: "#6E6E7C" }} />

          {/* Mid-edge nodes — left & right, horizontal orientation (16×10) */}
          <rect x={26}  y={74}  width={16} height={10} style={{ fill: "#6E6E7C" }} />
          <rect x={26}  y={120} width={16} height={10} style={{ fill: "#6E6E7C" }} />
          <rect x={162} y={74}  width={16} height={10} style={{ fill: "#6E6E7C" }} />
          <rect x={162} y={120} width={16} height={10} style={{ fill: "#6E6E7C" }} />
        </g>
      )}

      {/* ── Wordmark ───────────────────────────────────── */}
      {/* Translated to (300, 93) — vertically centred     */}
      {/* against the icon which spans y 42→234 (mid=138). */}
      {variant !== "icon" && (
        <g transform="translate(300 93)">
          <text
            x={0} y={0}
            style={{
              fontFamily:    "var(--font-family-mono)",
              fontWeight:    700,
              fontSize:      "54px",
              letterSpacing: "0.22em",
              fill:          "var(--color-content-primary)",
            }}
          >
            BEDROCK
            <tspan style={{ fill: "var(--color-gold)" }}>OS</tspan>
          </text>

          <text
            x={2} y={48}
            style={{
              fontFamily:    "var(--font-family-mono)",
              fontWeight:    500,
              fontSize:      "17px",
              letterSpacing: "0.27em",
              fill:          "var(--color-teal)",
            }}
          >
            CONSTRUCTION OPERATING SYSTEM
          </text>
        </g>
      )}
    </svg>
  );
}

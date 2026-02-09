import React from "react";

/* ─── SVG glyph decorations for file icons (top-right corner) ─── */

const g = (tx: number, ty: number, s: number, children: React.ReactNode) => (
  <g transform={`translate(${tx},${ty}) scale(${s})`}>{children}</g>
);

const stroke = { stroke: "currentColor", fill: "none" } as const;
const sw2 = { ...stroke, strokeWidth: 2 } as const;
const sw25 = {
  ...stroke,
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
} as const;

export const GLYPHS: Record<string, React.ReactNode> = {
  code: g(
    26,
    3,
    0.3,
    <>
      <path d="M14 6L8 12L14 18" {...sw25} strokeLinejoin="round" />
      <path d="M22 6L28 12L22 18" {...sw25} strokeLinejoin="round" />
    </>,
  ),

  image: g(
    27,
    4,
    0.28,
    <>
      <rect x="2" y="2" width="20" height="16" rx="2" {...sw2} />
      <circle cx="8" cy="8" r="2" fill="currentColor" />
      <path d="M2 14L8 10L12 13L16 9L22 14" {...sw2} />
    </>,
  ),

  video: g(
    28,
    4,
    0.28,
    <>
      <rect x="1" y="4" width="16" height="14" rx="2" {...sw2} />
      <polygon points="20,6 26,11 20,16" fill="currentColor" />
    </>,
  ),

  audio: g(
    28,
    4,
    0.28,
    <>
      <path d="M6 8V16" {...sw25} />
      <path d="M11 5V19" {...sw25} />
      <path d="M16 8V16" {...sw25} />
      <path d="M21 10V14" {...sw25} />
    </>,
  ),

  archive: g(
    28,
    4,
    0.28,
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" {...sw2} />
      <rect x="9" y="6" width="6" height="3" rx="1" fill="currentColor" />
      <rect x="9" y="11" width="6" height="3" rx="1" fill="currentColor" />
      <rect
        x="10"
        y="16"
        width="4"
        height="3"
        rx="1"
        {...{ ...stroke, strokeWidth: 1.5 }}
      />
    </>,
  ),

  doc: g(
    28,
    4,
    0.28,
    <>
      <path d="M4 4H16L20 8V20H4V4Z" {...sw2} />
      <line
        x1="7"
        y1="11"
        x2="17"
        y2="11"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="7"
        y1="14"
        x2="14"
        y2="14"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="7"
        y1="17"
        x2="16"
        y2="17"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </>,
  ),

  data: g(
    28,
    4,
    0.28,
    <>
      <ellipse cx="12" cy="6" rx="8" ry="3" {...sw2} />
      <path d="M4 6V18C4 19.7 7.6 21 12 21S20 19.7 20 18V6" {...sw2} />
      <path
        d="M4 12C4 13.7 7.6 15 12 15S20 13.7 20 12"
        {...{ ...stroke, strokeWidth: 1.5 }}
      />
    </>,
  ),

  exec: g(
    28,
    4,
    0.28,
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" {...sw2} />
      <path d="M9 8L15 12L9 16Z" fill="currentColor" />
    </>,
  ),

  config: g(
    28,
    4,
    0.28,
    <>
      <circle cx="12" cy="12" r="3" {...sw2} />
      <path
        d="M12 2V5M12 19V22M2 12H5M19 12H22M4.9 4.9L7.1 7.1M16.9 16.9L19.1 19.1M4.9 19.1L7.1 16.9M16.9 7.1L19.1 4.9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </>,
  ),

  font: g(
    28,
    4,
    0.28,
    <>
      <text
        x="12"
        y="17"
        textAnchor="middle"
        fill="currentColor"
        fontSize="16"
        fontWeight="bold"
        fontFamily="serif"
      >
        A
      </text>
    </>,
  ),
};

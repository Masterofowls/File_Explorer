import React from "react";
import type { FileEntry } from "../types";
import { ICON_MAP } from "../data/iconMap";
import { GLYPHS } from "../data/iconGlyphs";

/* \u2500\u2500\u2500 Folder icon (JetBrains-style with gradient) \u2500\u2500\u2500 */
const FolderIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="folderGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFD54F" />
        <stop offset="100%" stopColor="#FFB300" />
      </linearGradient>
      <linearGradient id="folderTab" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFC107" />
        <stop offset="100%" stopColor="#FFA000" />
      </linearGradient>
    </defs>
    <path d="M6 12C6 10.34 7.34 9 9 9H17.5L21.5 13H39C40.66 13 42 14.34 42 16V36C42 37.66 40.66 39 39 39H9C7.34 39 6 37.66 6 36V12Z" fill="url(#folderTab)" />
    <path d="M4 17H44V37C44 38.66 42.66 40 41 40H7C5.34 40 4 38.66 4 37V17Z" fill="url(#folderGrad)" opacity="0.95" />
    <path d="M4 17H44V19H4Z" fill="rgba(255,255,255,0.3)" />
  </svg>
);

/* \u2500\u2500\u2500 File icon with badge & glyph \u2500\u2500\u2500 */
interface FileIconProps {
  entry: FileEntry;
  size?: number;
}

const FileIcon: React.FC<FileIconProps> = ({ entry, size = 40 }) => {
  if (entry.is_dir) return <FolderIcon size={size} />;

  const ext = entry.extension.toLowerCase();
  const def = ICON_MAP[ext];
  const color = def?.color || "#78909C";
  const accent = def?.accent || "#FFFFFF";
  const badge = def?.badge || (ext ? ext.substring(0, 4).toUpperCase() : "");
  const glyph = def?.glyph;
  const fontSize = badge.length > 3 ? 5.5 : badge.length > 2 ? 6.5 : 7.5;

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`fg-${ext || "unk"}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FAFAFA" />
          <stop offset="100%" stopColor="#EEEEEE" />
        </linearGradient>
      </defs>
      <path d="M11 4H30L38 12V42C38 43.1 37.1 44 36 44H11C9.9 44 9 43.1 9 42V6C9 4.9 9.9 4 11 4Z"
        fill={`url(#fg-${ext || "unk"})`} stroke="#D0D0D0" strokeWidth="0.75" />
      <path d="M30 4L38 12H32C30.9 12 30 11.1 30 10V4Z" fill="#E0E0E0" />
      <rect x="14" y="16" width="14" height="1.5" rx="0.75" fill="#E8E8E8" />
      <rect x="14" y="20" width="18" height="1.5" rx="0.75" fill="#E8E8E8" />
      <rect x="14" y="24" width="11" height="1.5" rx="0.75" fill="#E8E8E8" />
      {badge && (
        <>
          <rect x="11" y="30" width="24" height="11" rx="2.5" fill={color} />
          <text x="23" y="37.8" textAnchor="middle" fill={accent}
            fontSize={fontSize} fontWeight="700"
            fontFamily="Inter, system-ui, sans-serif" letterSpacing="0.3">
            {badge}
          </text>
        </>
      )}
      {glyph && GLYPHS[glyph] && (
        <g color={color} opacity="0.55">{GLYPHS[glyph]}</g>
      )}
    </svg>
  );
};

export default React.memo(FileIcon);

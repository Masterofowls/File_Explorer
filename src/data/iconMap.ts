/* ─── JetBrains-style file icon extension → visual mapping ─── */

export type GlyphKind =
  | "code"
  | "image"
  | "video"
  | "audio"
  | "archive"
  | "doc"
  | "data"
  | "exec"
  | "config"
  | "font";

export interface IconDef {
  color: string;
  accent: string;
  badge: string;
  glyph?: GlyphKind;
}

// Helpers to reduce repetition
const code = (color: string, accent: string, badge: string): IconDef => ({
  color,
  accent,
  badge,
  glyph: "code",
});
const img = (accent: string, badge: string): IconDef => ({
  color: "#A0C4FF",
  accent,
  badge,
  glyph: "image",
});
const vid = (badge: string): IconDef => ({
  color: "#CE93D8",
  accent: "#6A1B9A",
  badge,
  glyph: "video",
});
const aud = (badge: string): IconDef => ({
  color: "#80DEEA",
  accent: "#00838F",
  badge,
  glyph: "audio",
});
const arc = (badge: string, c = "#BCAAA4", a = "#5D4037"): IconDef => ({
  color: c,
  accent: a,
  badge,
  glyph: "archive",
});
const doc = (color: string, accent: string, badge: string): IconDef => ({
  color,
  accent,
  badge,
  glyph: "doc",
});
const dat = (color: string, accent: string, badge: string): IconDef => ({
  color,
  accent,
  badge,
  glyph: "data",
});
const cfg = (color: string, accent: string, badge: string): IconDef => ({
  color,
  accent,
  badge,
  glyph: "config",
});
const exe = (badge: string, c = "#37474F", a = "#78909C"): IconDef => ({
  color: c,
  accent: a,
  badge,
  glyph: "exec",
});

export const ICON_MAP: Record<string, IconDef> = {
  // TypeScript / JavaScript
  ts: code("#3178C6", "#FFFFFF", "TS"),
  tsx: code("#3178C6", "#61DAFB", "TSX"),
  js: code("#F7DF1E", "#323330", "JS"),
  jsx: code("#61DAFB", "#20232A", "JSX"),
  mjs: code("#F7DF1E", "#323330", "MJS"),
  cjs: code("#F7DF1E", "#323330", "CJS"),
  // Python
  py: code("#3776AB", "#FFD43B", "PY"),
  pyw: code("#3776AB", "#FFD43B", "PYW"),
  pyi: code("#3776AB", "#FFD43B", "PYI"),
  // Rust / Go
  rs: code("#DEA584", "#000000", "RS"),
  toml: cfg("#9C4121", "#FFFFFF", "TOML"),
  go: code("#00ADD8", "#FFFFFF", "GO"),
  // JVM
  java: code("#ED8B00", "#FFFFFF", "JAVA"),
  kt: code("#7F52FF", "#FFFFFF", "KT"),
  kts: code("#7F52FF", "#FFFFFF", "KTS"),
  scala: code("#DC322F", "#FFFFFF", "SC"),
  // C / C++ / C#
  c: code("#A8B9CC", "#00599C", "C"),
  h: code("#A8B9CC", "#00599C", "H"),
  cpp: code("#00599C", "#FFFFFF", "C++"),
  hpp: code("#00599C", "#FFFFFF", "H++"),
  cs: code("#512BD4", "#FFFFFF", "C#"),
  // Web
  html: code("#E44D26", "#FFFFFF", "HTML"),
  htm: code("#E44D26", "#FFFFFF", "HTM"),
  css: code("#1572B6", "#FFFFFF", "CSS"),
  scss: code("#CF649A", "#FFFFFF", "SCSS"),
  sass: code("#CF649A", "#FFFFFF", "SASS"),
  less: code("#1D365D", "#FFFFFF", "LESS"),
  vue: code("#42B883", "#35495E", "VUE"),
  svelte: code("#FF3E00", "#FFFFFF", "SVL"),
  // Shell
  sh: exe("SH", "#4EAA25", "#FFFFFF"),
  bash: exe("BASH", "#4EAA25", "#FFFFFF"),
  zsh: exe("ZSH", "#4EAA25", "#FFFFFF"),
  fish: exe("FISH", "#4EAA25", "#FFFFFF"),
  bat: exe("BAT", "#C1F12E", "#1E1E1E"),
  cmd: exe("CMD", "#C1F12E", "#1E1E1E"),
  ps1: exe("PS1", "#012456", "#FFFFFF"),
  // Data / Config
  json: dat("#F7DF1E", "#323330", "JSON"),
  jsonc: dat("#F7DF1E", "#323330", "JSONC"),
  yaml: cfg("#CB171E", "#FFFFFF", "YAML"),
  yml: cfg("#CB171E", "#FFFFFF", "YML"),
  xml: dat("#FF8800", "#FFFFFF", "XML"),
  csv: dat("#2E7D32", "#FFFFFF", "CSV"),
  sql: dat("#336791", "#FFFFFF", "SQL"),
  db: dat("#336791", "#FFFFFF", "DB"),
  env: cfg("#ECD53F", "#1E1E1E", "ENV"),
  ini: cfg("#8B8B8B", "#FFFFFF", "INI"),
  cfg: cfg("#8B8B8B", "#FFFFFF", "CFG"),
  conf: cfg("#8B8B8B", "#FFFFFF", "CONF"),
  // Documents
  md: doc("#083FA1", "#FFFFFF", "MD"),
  mdx: doc("#083FA1", "#F7DF1E", "MDX"),
  txt: doc("#8B8B8B", "#FFFFFF", "TXT"),
  rtf: doc("#8B8B8B", "#FFFFFF", "RTF"),
  pdf: doc("#F40F02", "#FFFFFF", "PDF"),
  doc: doc("#2B579A", "#FFFFFF", "DOC"),
  docx: doc("#2B579A", "#FFFFFF", "DOCX"),
  xls: doc("#217346", "#FFFFFF", "XLS"),
  xlsx: doc("#217346", "#FFFFFF", "XLSX"),
  ppt: doc("#D24726", "#FFFFFF", "PPT"),
  pptx: doc("#D24726", "#FFFFFF", "PPTX"),
  // Images
  png: img("#1565C0", "PNG"),
  jpg: img("#E65100", "JPG"),
  jpeg: img("#E65100", "JPEG"),
  gif: img("#7B1FA2", "GIF"),
  svg: { color: "#FFB74D", accent: "#E65100", badge: "SVG", glyph: "image" },
  webp: img("#4CAF50", "WEBP"),
  ico: img("#FFC107", "ICO"),
  bmp: img("#795548", "BMP"),
  tiff: img("#795548", "TIFF"),
  // Video
  mp4: vid("MP4"),
  mkv: vid("MKV"),
  avi: vid("AVI"),
  mov: vid("MOV"),
  webm: vid("WEBM"),
  flv: vid("FLV"),
  // Audio
  mp3: aud("MP3"),
  wav: aud("WAV"),
  flac: aud("FLAC"),
  ogg: aud("OGG"),
  aac: aud("AAC"),
  m4a: aud("M4A"),
  // Archives
  zip: arc("ZIP"),
  tar: arc("TAR"),
  gz: arc("GZ"),
  xz: arc("XZ"),
  bz2: arc("BZ2"),
  "7z": arc("7Z"),
  rar: arc("RAR"),
  deb: arc("DEB", "#A81D33", "#FFFFFF"),
  rpm: arc("RPM", "#EE0000", "#FFFFFF"),
  // Executables
  exe: exe("EXE"),
  msi: exe("MSI"),
  appimage: exe("APP"),
  // Fonts
  ttf: { color: "#EC407A", accent: "#FFFFFF", badge: "TTF", glyph: "font" },
  otf: { color: "#EC407A", accent: "#FFFFFF", badge: "OTF", glyph: "font" },
  woff: { color: "#EC407A", accent: "#FFFFFF", badge: "WOFF", glyph: "font" },
  woff2: { color: "#EC407A", accent: "#FFFFFF", badge: "WF2", glyph: "font" },
  // Other
  lock: cfg("#8B8B8B", "#FFFFFF", "LOCK"),
  log: doc("#8B8B8B", "#FFFFFF", "LOG"),
  map: dat("#8B8B8B", "#FFFFFF", "MAP"),
  wasm: code("#654FF0", "#FFFFFF", "WASM"),
};

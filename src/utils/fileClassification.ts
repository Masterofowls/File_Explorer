/* ─── File type classification for preview ─── */

export type PreviewKind =
  | "text"
  | "code"
  | "markdown"
  | "image"
  | "svg"
  | "audio"
  | "video"
  | "pdf"
  | "csv"
  | "json"
  | "binary"
  | "unsupported";

const CODE_EXTS = new Set([
  "js",
  "jsx",
  "ts",
  "tsx",
  "mjs",
  "cjs",
  "py",
  "pyw",
  "pyi",
  "rs",
  "go",
  "java",
  "kt",
  "kts",
  "scala",
  "c",
  "h",
  "cpp",
  "hpp",
  "cc",
  "cxx",
  "cs",
  "rb",
  "php",
  "lua",
  "pl",
  "r",
  "swift",
  "m",
  "mm",
  "html",
  "htm",
  "css",
  "scss",
  "sass",
  "less",
  "vue",
  "svelte",
  "astro",
  "sh",
  "bash",
  "zsh",
  "fish",
  "bat",
  "cmd",
  "ps1",
  "sql",
  "graphql",
  "gql",
  "wasm",
  "asm",
  "dockerfile",
]);

const TEXT_EXTS = new Set([
  "txt",
  "rtf",
  "log",
  "env",
  "ini",
  "cfg",
  "conf",
  "config",
  "properties",
  "editorconfig",
  "gitignore",
  "gitattributes",
  "gitmodules",
  "dockerignore",
  "npmignore",
  "eslintignore",
  "lock",
  "toml",
  "yaml",
  "yml",
  "xml",
  "makefile",
  "cmake",
]);

const IMAGE_EXTS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "ico",
  "tiff",
  "tif",
  "avif",
]);

const AUDIO_EXTS = new Set([
  "mp3",
  "wav",
  "flac",
  "ogg",
  "aac",
  "m4a",
  "wma",
  "opus",
]);
const VIDEO_EXTS = new Set([
  "mp4",
  "webm",
  "mov",
  "avi",
  "mkv",
  "flv",
  "wmv",
  "m4v",
  "ogv",
]);

const BINARY_EXTS = new Set(["docx", "doc", "xls", "xlsx", "ppt", "pptx"]);

export function classifyFile(ext: string): PreviewKind {
  const e = ext.toLowerCase();
  if (e === "svg") return "svg";
  if (e === "md" || e === "mdx") return "markdown";
  if (e === "pdf") return "pdf";
  if (e === "csv" || e === "tsv") return "csv";
  if (e === "json" || e === "jsonc" || e === "json5") return "json";
  if (CODE_EXTS.has(e)) return "code";
  if (TEXT_EXTS.has(e)) return "text";
  if (IMAGE_EXTS.has(e)) return "image";
  if (AUDIO_EXTS.has(e)) return "audio";
  if (VIDEO_EXTS.has(e)) return "video";
  if (BINARY_EXTS.has(e)) return "binary";
  return "unsupported";
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return dateStr;
}

export function getFileTypeLabel(ext: string, isDir: boolean): string {
  if (isDir) return "Folder";
  if (!ext) return "File";
  const types: Record<string, string> = {
    txt: "Text Document",
    md: "Markdown",
    pdf: "PDF Document",
    doc: "Word Document",
    docx: "Word Document",
    xls: "Excel Spreadsheet",
    xlsx: "Excel Spreadsheet",
    ppt: "PowerPoint",
    pptx: "PowerPoint",
    jpg: "JPEG Image",
    jpeg: "JPEG Image",
    png: "PNG Image",
    gif: "GIF Image",
    svg: "SVG Image",
    webp: "WebP Image",
    mp3: "MP3 Audio",
    wav: "WAV Audio",
    flac: "FLAC Audio",
    mp4: "MP4 Video",
    mkv: "MKV Video",
    avi: "AVI Video",
    mov: "QuickTime Video",
    zip: "ZIP Archive",
    tar: "TAR Archive",
    gz: "GZip Archive",
    "7z": "7-Zip Archive",
    rar: "RAR Archive",
    js: "JavaScript",
    ts: "TypeScript",
    tsx: "TypeScript React",
    jsx: "JavaScript React",
    py: "Python Script",
    rs: "Rust Source",
    go: "Go Source",
    java: "Java Source",
    c: "C Source",
    cpp: "C++ Source",
    h: "C Header",
    css: "CSS Stylesheet",
    html: "HTML Document",
    json: "JSON",
    xml: "XML Document",
    yaml: "YAML",
    yml: "YAML",
    toml: "TOML",
    sh: "Shell Script",
    bat: "Batch File",
    exe: "Executable",
    dll: "DLL Library",
    so: "Shared Library",
    iso: "Disk Image",
    dmg: "Disk Image",
  };
  return types[ext.toLowerCase()] || `${ext.toUpperCase()} File`;
}

export function pathSegments(path: string): { name: string; path: string }[] {
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  const segments: { name: string; path: string }[] = [];
  let current = "";

  // Handle root
  if (normalized.startsWith("/")) {
    segments.push({ name: "/", path: "/" });
  }

  for (const part of parts) {
    current += "/" + part;
    segments.push({ name: part, path: current });
  }

  return segments;
}

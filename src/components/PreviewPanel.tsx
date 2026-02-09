import React, { useEffect, useState, useMemo, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { FileEntry } from "../types";
import { formatFileSize, formatDate } from "../utils/formatters";
import { classifyFile } from "../utils/fileClassification";
import FileIcon from "./FileIcon";
import { PreviewContent } from "./preview/PreviewContent";

interface PreviewPanelProps {
  file: FileEntry | null;
  onClose: () => void;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ file, onClose }) => {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kind = useMemo(
    () => (file ? classifyFile(file.extension) : "unsupported"),
    [file],
  );

  const loadContent = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setContent(null);

    try {
      switch (kind) {
        case "text":
        case "code":
        case "markdown":
        case "csv":
        case "json":
        case "svg": {
          const text: string = await invoke("read_file_text", {
            path: file.path,
            maxBytes: 2 * 1024 * 1024,
          });
          setContent(text);
          break;
        }
        case "image":
        case "audio":
        case "video":
        case "pdf":
          setContent(convertFileSrc(file.path));
          break;
        default:
          setContent(null);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [file, kind]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  if (!file) return null;

  return (
    <div className="preview-panel">
      <div className="preview-header">
        <div className="preview-title-row">
          <FileIcon entry={file} size={24} />
          <span className="preview-filename">{file.name}</span>
        </div>
        <button className="preview-close" onClick={onClose} title="Close preview">
          &#x2715;
        </button>
      </div>

      <div className="preview-meta">
        <span>{formatFileSize(file.size)}</span>
        <span>&bull;</span>
        <span>{formatDate(file.modified)}</span>
        {file.extension && (
          <>
            <span>&bull;</span>
            <span>.{file.extension.toUpperCase()}</span>
          </>
        )}
      </div>

      <div className="preview-body">
        {loading && (
          <div className="preview-loading">
            <div className="preview-spinner" />
            <span>Loading preview&hellip;</span>
          </div>
        )}

        {error && (
          <div className="preview-error">
            <span>&#x26a0; {error}</span>
          </div>
        )}

        {!loading && !error && content !== null && (
          <PreviewContent kind={kind} content={content} ext={file.extension} />
        )}

        {!loading && !error && content === null && (kind === "unsupported" || kind === "binary") && (
          <div className="preview-unsupported">
            <FileIcon entry={file} size={64} />
            <p>
              {kind === "binary"
                ? "Binary file \u2013 preview not available"
                : "Preview not available for ." + (file.extension || "this file type")}
            </p>
            <span className="preview-hint">{formatFileSize(file.size)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewPanel;

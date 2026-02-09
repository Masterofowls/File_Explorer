import React, { useMemo } from "react";
import { highlightCode } from "../../utils/syntaxHighlight";
import { renderMarkdown } from "../../utils/markdownRenderer";
import { parseCSV } from "../../utils/csvParser";
import type { PreviewKind } from "../../utils/fileClassification";

/* ─── JSON viewer ─── */
export const JsonPreview: React.FC<{ content: string }> = ({ content }) => {
  const formatted = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(content), null, 2);
    } catch {
      return content;
    }
  }, [content]);

  return (
    <div className="preview-code-container">
      <pre className="preview-code">
        <code
          dangerouslySetInnerHTML={{ __html: highlightCode(formatted, "json") }}
        />
      </pre>
    </div>
  );
};

/* ─── CSV table viewer ─── */
export const CsvPreview: React.FC<{ content: string }> = ({ content }) => {
  const { headers, rows } = useMemo(() => parseCSV(content), [content]);

  if (!headers.length)
    return <div className="preview-unsupported">Empty CSV file</div>;

  return (
    <div className="preview-csv-container">
      <table className="preview-csv-table">
        <thead>
          <tr>
            <th className="csv-row-num">#</th>
            {headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              <td className="csv-row-num">{ri + 1}</td>
              {row.map((cell, ci) => (
                <td key={ci}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length >= 100 && (
        <div
          className="preview-hint"
          style={{ padding: 8, textAlign: "center" }}
        >
          Showing first 100 rows
        </div>
      )}
    </div>
  );
};

/* ─── Content renderer dispatcher ─── */
export const PreviewContent: React.FC<{
  kind: PreviewKind;
  content: string;
  ext: string;
}> = ({ kind, content, ext }) => {
  switch (kind) {
    case "image":
      return (
        <div className="preview-image-container">
          <img
            src={content}
            alt="Preview"
            className="preview-image"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      );

    case "svg":
      return (
        <div className="preview-svg-container">
          <div
            className="preview-svg-render"
            dangerouslySetInnerHTML={{ __html: content }}
          />
          <details className="preview-source-toggle">
            <summary>View source</summary>
            <pre className="preview-code">
              <code>{content}</code>
            </pre>
          </details>
        </div>
      );

    case "video":
      return (
        <div className="preview-media-container">
          <video controls className="preview-video" src={content}>
            Your browser does not support video playback.
          </video>
        </div>
      );

    case "audio":
      return (
        <div className="preview-audio-container">
          <div className="preview-audio-artwork">🎵</div>
          <audio controls className="preview-audio" src={content}>
            Your browser does not support audio playback.
          </audio>
        </div>
      );

    case "pdf":
      return (
        <div className="preview-pdf-container">
          <iframe src={content} className="preview-pdf" title="PDF Preview" />
        </div>
      );

    case "markdown":
      return (
        <div
          className="preview-markdown"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      );

    case "json":
      return <JsonPreview content={content} />;

    case "csv":
      return <CsvPreview content={content} />;

    case "code":
      return (
        <div className="preview-code-container">
          <pre className="preview-code">
            <code
              dangerouslySetInnerHTML={{ __html: highlightCode(content, ext) }}
            />
          </pre>
          <div className="preview-line-count">
            {content.split("\n").length} lines
          </div>
        </div>
      );

    case "text":
    default:
      return (
        <div className="preview-code-container">
          <pre className="preview-code">
            <code>{content}</code>
          </pre>
          <div className="preview-line-count">
            {content.split("\n").length} lines
          </div>
        </div>
      );
  }
};

/* ─── Simple markdown → HTML renderer ─── */

export function renderMarkdown(md: string): string {
  let h = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // fenced code blocks
  h = h.replace(/```[\s\S]*?```/g, (m) => {
    const inner = m.slice(3, -3).replace(/^[a-z]*\n/, "");
    return `<pre class="md-codeblock"><code>${inner}</code></pre>`;
  });
  // inline code
  h = h.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');
  // headings (h6→h1 order to avoid prefix match)
  h = h.replace(/^######\s+(.*)$/gm, "<h6>$1</h6>");
  h = h.replace(/^#####\s+(.*)$/gm, "<h5>$1</h5>");
  h = h.replace(/^####\s+(.*)$/gm, "<h4>$1</h4>");
  h = h.replace(/^###\s+(.*)$/gm, "<h3>$1</h3>");
  h = h.replace(/^##\s+(.*)$/gm, "<h2>$1</h2>");
  h = h.replace(/^#\s+(.*)$/gm, "<h1>$1</h1>");
  // bold / italic / strikethrough
  h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/\*(.+?)\*/g, "<em>$1</em>");
  h = h.replace(/__(.+?)__/g, "<strong>$1</strong>");
  h = h.replace(/_(.+?)_/g, "<em>$1</em>");
  h = h.replace(/~~(.+?)~~/g, "<del>$1</del>");
  // blockquotes
  h = h.replace(/^&gt;\s+(.*)$/gm, "<blockquote>$1</blockquote>");
  // horizontal rules
  h = h.replace(/^---+$/gm, "<hr/>");
  // unordered lists
  h = h.replace(/^[\s]*[-*+]\s+(.*)$/gm, "<li>$1</li>");
  // links
  h = h.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>',
  );
  // image refs
  h = h.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<span class="md-img-ref">🖼 $1</span>',
  );
  // paragraphs
  h = h.replace(/\n\n/g, "</p><p>");
  return `<p>${h}</p>`;
}

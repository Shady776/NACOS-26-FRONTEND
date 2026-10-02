import DOMPurify from "dompurify";

/**
 * Turn a saved submission into HTML that is safe to put in the page.
 * - Rich-text submissions (from the editor) keep their formatting, but scripts,
 *   event handlers and javascript: links are stripped by DOMPurify.
 * - Plain-text submissions (no tags) keep their line breaks.
 * Use with dangerouslySetInnerHTML={{ __html: toSafeHtml(content) }}.
 * The backend also sanitizes on save; this is the second layer.
 */
export const toSafeHtml = (content: string | null | undefined, emptyHtml = "<p>No content available</p>"): string => {
  if (!content) return emptyHtml;
  // The rich-text editor saves HTML. A short answer with no formatting can contain only
  // entities (e.g. "text&nbsp;"), so entities count as HTML too, otherwise they would be
  // escaped and shown literally as "&nbsp;".
  const looksLikeHtml = /<[a-z][\s\S]*>|&(?:[a-z]+|#\d+|#x[0-9a-f]+);/i.test(content);
  const html = looksLikeHtml
    ? content
    : content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
};
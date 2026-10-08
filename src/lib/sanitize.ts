import "server-only";
import sanitizeHtml from "sanitize-html";

/** Sanitize staff/partner-authored rich text before rendering it with dangerouslySetInnerHTML. */
export function sanitize(html: string | null | undefined) {
  if (!html) return "";
  // Plain text (no tags) → keep paragraphs.
  const source = /<[a-z][\s\S]*>/i.test(html)
    ? html
    : html
        .split(/\n{2,}/)
        .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
        .join("");
  return sanitizeHtml(source, {
    allowedTags: ["p", "br", "h2", "h3", "h4", "ul", "ol", "li", "a", "strong", "b", "em", "i", "blockquote", "code", "pre", "hr"],
    allowedAttributes: { a: ["href", "title", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow", target: "_blank" }),
    },
  });
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

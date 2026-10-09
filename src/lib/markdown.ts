import "server-only";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

/**
 * CMS rich text is written in Markdown. It is converted to HTML on the server and then
 * sanitized with a strict allow-list, so content from any editor can't inject scripts.
 */
export function markdownToSafeHtml(md: string | null | undefined): string {
  if (!md) return "";
  const html = marked.parse(md, { async: false, gfm: true, breaks: false }) as string;
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "h2", "h3", "h4", "ul", "ol", "li", "a", "strong", "b", "em", "i", "blockquote", "code", "pre", "hr", "table", "thead", "tbody", "tr", "th", "td"],
    allowedAttributes: { a: ["href", "title", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      // Headings in content never compete with the page's own <h1>.
      h1: "h2",
      a: (tagName, attribs) => {
        const href = attribs.href ?? "";
        const external = /^https?:\/\//i.test(href);
        const out: Record<string, string> = external ? { href, target: "_blank", rel: "noopener noreferrer nofollow" } : { href };
        if (attribs.title) out.title = attribs.title;
        return { tagName, attribs: out };
      },
    },
  });
}

/** Plain-text excerpt from Markdown (for meta descriptions and cards). */
export function markdownExcerpt(md: string | null | undefined, max = 160): string {
  if (!md) return "";
  const text = md
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
}

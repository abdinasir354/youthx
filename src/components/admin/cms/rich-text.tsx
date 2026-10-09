"use client";

import { useRef, useState } from "react";
import { Bold, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Loader2, Quote } from "lucide-react";
import { previewMarkdown } from "@/app/actions/cms";
import { cn } from "@/lib/utils";
import { MediaPicker } from "./media-fields";

type Wrap = { before: string; after?: string; line?: boolean; placeholder: string };

const TOOLS: { label: string; icon: typeof Bold; wrap: Wrap }[] = [
  { label: "Bold", icon: Bold, wrap: { before: "**", after: "**", placeholder: "bold text" } },
  { label: "Italic", icon: Italic, wrap: { before: "_", after: "_", placeholder: "italic text" } },
  { label: "Heading", icon: Heading2, wrap: { before: "## ", line: true, placeholder: "Heading" } },
  { label: "Subheading", icon: Heading3, wrap: { before: "### ", line: true, placeholder: "Subheading" } },
  { label: "Bulleted list", icon: List, wrap: { before: "- ", line: true, placeholder: "List item" } },
  { label: "Numbered list", icon: ListOrdered, wrap: { before: "1. ", line: true, placeholder: "List item" } },
  { label: "Quote", icon: Quote, wrap: { before: "> ", line: true, placeholder: "Quote" } },
  { label: "Link", icon: Link2, wrap: { before: "[", after: "](https://)", placeholder: "link text" } },
];

/**
 * Markdown editor with a formatting toolbar and a live preview. The preview HTML comes from
 * the server, sanitized exactly as on the public site.
 */
export function RichTextEditor({ id, value, onChange, invalid, maxLength }: { id: string; value: string; onChange: (v: string) => void; invalid?: boolean; maxLength?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [picker, setPicker] = useState(false);

  /** Puts a photo on its own line at the cursor (in stories, it becomes the chapter's photo). */
  function insertImage(url: string, alt: string) {
    const el = ref.current;
    const at = el ? el.selectionEnd : value.length;
    const before = value.slice(0, at).replace(/\s*$/, "");
    const after = value.slice(at).replace(/^\s*/, "");
    const md = `![${alt.replace(/[[\]]/g, "")}](${url})`;
    onChange([before, md, after].filter(Boolean).join("\n\n"));
  }

  function apply({ before, after = "", line, placeholder }: Wrap) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const selected = value.slice(s, e) || placeholder;
    let insert: string;
    if (line) {
      const atLineStart = s === 0 || value[s - 1] === "\n";
      insert = (atLineStart ? "" : "\n") + selected.split("\n").map((l) => before + l).join("\n");
    } else {
      insert = before + selected + after;
    }
    const next = value.slice(0, s) + insert + value.slice(e);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const start = s + insert.indexOf(selected);
      el.setSelectionRange(start, start + selected.length);
    });
  }

  async function showPreview() {
    setTab("preview");
    setLoading(true);
    const res = await previewMarkdown(value);
    setLoading(false);
    setHtml(res.ok && res.data ? res.data : "<p>Preview unavailable.</p>");
  }

  return (
    <div className={cn("overflow-hidden rounded-md border bg-white", invalid ? "border-danger" : "border-border focus-within:border-secondary focus-within:ring-2 focus-within:ring-primary/60")}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/60 px-1.5 py-1">
        <div role="tablist" aria-label="Editor mode" className="mr-2 flex rounded-md bg-white p-0.5 text-xs font-semibold">
          <button type="button" role="tab" aria-selected={tab === "write"} onClick={() => setTab("write")} className={cn("rounded px-2.5 py-1", tab === "write" ? "bg-secondary text-white" : "text-muted-foreground")}>
            Write
          </button>
          <button type="button" role="tab" aria-selected={tab === "preview"} onClick={() => void showPreview()} className={cn("rounded px-2.5 py-1", tab === "preview" ? "bg-secondary text-white" : "text-muted-foreground")}>
            Preview
          </button>
        </div>
        {tab === "write" &&
          TOOLS.map(({ label, icon: Icon, wrap }) => (
            <button key={label} type="button" onClick={() => apply(wrap)} title={label} aria-label={label} className="rounded p-1.5 text-secondary/80 hover:bg-white hover:text-secondary">
              <Icon className="size-4" />
            </button>
          ))}
        {tab === "write" && (
          <button type="button" onClick={() => setPicker(true)} title="Photo" aria-label="Insert photo" className="ml-1 inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-semibold text-secondary/80 hover:bg-white hover:text-secondary">
            <ImagePlus className="size-4" /> Photo
          </button>
        )}
      </div>
      <MediaPicker open={picker} onClose={() => setPicker(false)} kind="image" folder="images" onPick={(items) => items[0] && insertImage(items[0].url, items[0].alt_text ?? "")} />
      {tab === "write" ? (
        <textarea
          ref={ref}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          aria-invalid={invalid}
          rows={10}
          className="block min-h-48 w-full resize-y bg-white px-3.5 py-2.5 font-mono text-sm leading-relaxed text-foreground focus:outline-none"
          placeholder="Write here. Use the toolbar for headings, lists and links."
        />
      ) : (
        <div className="min-h-48 px-4 py-3">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Rendering…
            </p>
          ) : (
            <div className="prose-cms text-sm" dangerouslySetInnerHTML={{ __html: html || "<p class='text-muted-foreground'>Nothing to preview yet.</p>" }} />
          )}
        </div>
      )}
    </div>
  );
}

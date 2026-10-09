"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Eye, EyeOff, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { deleteNavItem, reorderNav, saveNavItem } from "@/app/actions/cms";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label } from "@/components/ui/input";
import { adminErrorText, useConfirm } from "@/components/admin/ui/feedback";
import { SortableList } from "@/components/admin/ui/sortable";

export type NavItem = { id: string; menu: "header" | "footer" | "legal"; label: string; href: string; position: number; is_visible: boolean; open_in_new_tab: boolean };

const MENUS: { key: NavItem["menu"]; title: string; description: string }[] = [
  { key: "header", title: "Main navigation", description: "The links across the top of every page." },
  { key: "footer", title: "Footer links", description: "Quick links in the footer." },
  { key: "legal", title: "Legal links", description: "Privacy, terms and similar links at the very bottom." },
];

export function NavigationEditor({ items: initial }: { items: NavItem[] }) {
  const [items, setItems] = useState(initial);
  const [menu, setMenu] = useState<NavItem["menu"]>("header");
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [saving, startSaving] = useTransition();
  const confirm = useConfirm();
  const list = items.filter((i) => i.menu === menu).sort((a, b) => a.position - b.position);

  function reorder(next: NavItem[]) {
    const prev = items;
    const positioned = next.map((n, i) => ({ ...n, position: i }));
    setItems((all) => [...all.filter((i) => i.menu !== menu), ...positioned]);
    startSaving(async () => {
      const res = await reorderNav(positioned.map((n) => n.id));
      if (!res.ok) {
        setItems(prev);
        toast.error(adminErrorText(res.error));
      } else toast.success("Menu order saved");
    });
  }

  async function save(draft: Omit<NavItem, "id" | "position"> & { id?: string }) {
    const res = await saveNavItem(draft);
    if (!res.ok) {
      toast.error(adminErrorText(res.error));
      return res.fieldErrors ?? {};
    }
    const id = res.data!;
    setItems((all) =>
      draft.id ? all.map((i) => (i.id === id ? { ...i, ...draft, id } : i)) : [...all, { ...draft, id, position: all.filter((i) => i.menu === draft.menu).length }],
    );
    setEditing(null);
    toast.success(draft.id ? "Link updated" : "Link added");
    return null;
  }

  async function remove(item: NavItem) {
    if (!(await confirm({ title: `Remove “${item.label}”?`, body: "The link disappears from the menu right away.", confirmLabel: "Remove", danger: true }))) return;
    const res = await deleteNavItem(item.id);
    if (!res.ok) return void toast.error(adminErrorText(res.error));
    setItems((all) => all.filter((i) => i.id !== item.id));
    toast.success("Link removed");
  }

  async function toggle(item: NavItem) {
    const res = await saveNavItem({ ...item, is_visible: !item.is_visible });
    if (!res.ok) return void toast.error(adminErrorText(res.error));
    setItems((all) => all.map((i) => (i.id === item.id ? { ...i, is_visible: !i.is_visible } : i)));
  }

  const current = MENUS.find((m) => m.key === menu)!;

  return (
    <div>
      <div role="tablist" aria-label="Menus" className="mb-5 flex gap-1 border-b border-border">
        {MENUS.map((m) => (
          <button
            key={m.key}
            role="tab"
            type="button"
            aria-selected={menu === m.key}
            onClick={() => {
              setMenu(m.key);
              setEditing(null);
            }}
            className={cn("-mb-px border-b-2 px-4 py-2 text-sm font-medium", menu === m.key ? "border-secondary text-secondary" : "border-transparent text-muted-foreground hover:text-secondary")}
          >
            {m.title}
          </button>
        ))}
      </div>
      <div className="mb-3 flex items-center justify-between text-sm">
        <p className="text-muted-foreground">{current.description} Drag to reorder.</p>
        {saving && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" /> Saving…
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-white">
        {list.length === 0 && editing !== "new" && <p className="px-4 py-8 text-center text-sm text-muted-foreground">No links in this menu.</p>}
        <SortableList
          items={list}
          getId={(i) => i.id}
          onReorder={reorder}
          renderItem={(item, handle) =>
            editing === item.id ? (
              <ItemForm item={item} menu={menu} onCancel={() => setEditing(null)} onSave={save} />
            ) : (
              <div className={cn("flex items-center gap-2 border-b border-border px-3 py-2.5 last:border-b-0", !item.is_visible && "opacity-60")}>
                {handle}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-secondary">
                    {item.label} {!item.is_visible && <span className="ml-1 text-xs font-normal text-muted-foreground">(hidden)</span>}
                  </p>
                  <p className="flex items-center gap-1 truncate font-mono text-xs text-muted-foreground">
                    {item.href} {item.open_in_new_tab && <ExternalLink className="size-3" aria-label="opens in a new tab" />}
                  </p>
                </div>
                <button type="button" onClick={() => void toggle(item)} className="rounded-md p-2 text-muted-foreground hover:bg-muted" aria-label={item.is_visible ? `Hide ${item.label}` : `Show ${item.label}`}>
                  {item.is_visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </button>
                <button type="button" onClick={() => setEditing(item.id)} className="rounded-md p-2 text-muted-foreground hover:bg-muted" aria-label={`Edit ${item.label}`}>
                  <Pencil className="size-4" />
                </button>
                <button type="button" onClick={() => void remove(item)} className="rounded-md p-2 text-danger hover:bg-danger-soft" aria-label={`Remove ${item.label}`}>
                  <Trash2 className="size-4" />
                </button>
              </div>
            )
          }
        />
        {editing === "new" && <ItemForm menu={menu} onCancel={() => setEditing(null)} onSave={save} />}
      </div>
      {editing !== "new" && (
        <Button variant="outline" className="mt-3" onClick={() => setEditing("new")}>
          <Plus /> Add link
        </Button>
      )}
    </div>
  );
}

function ItemForm({ item, menu, onCancel, onSave }: { item?: NavItem; menu: NavItem["menu"]; onCancel: () => void; onSave: (d: Omit<NavItem, "id" | "position"> & { id?: string }) => Promise<Record<string, string> | null> }) {
  const [label, setLabel] = useState(item?.label ?? "");
  const [href, setHref] = useState(item?.href ?? "/");
  const [newTab, setNewTab] = useState(item?.open_in_new_tab ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-3 border-b border-border bg-muted/40 p-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const errs = await onSave({ id: item?.id, menu, label, href, open_in_new_tab: newTab, is_visible: item?.is_visible ?? true });
          if (errs) setErrors(errs);
        });
      }}
    >
      <div>
        <Label htmlFor="nav-label">Label</Label>
        <Input id="nav-label" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} autoFocus required className="h-10" />
        {errors.label && <p className="mt-1 text-xs text-danger">{errors.label}</p>}
      </div>
      <div>
        <Label htmlFor="nav-href">Link</Label>
        <Input id="nav-href" value={href} onChange={(e) => setHref(e.target.value)} placeholder="/about or https://…" required className="h-10 font-mono text-xs" />
        {errors.href && <p className="mt-1 text-xs text-danger">{errors.href}</p>}
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-secondary">
          <Checkbox checked={newTab} onChange={(e) => setNewTab(e.target.checked)} /> New tab
        </label>
        <Button type="button" variant="ghost" size="icon" onClick={onCancel} aria-label="Cancel">
          <X />
        </Button>
        <Button type="submit" variant="secondary" size="sm" className="h-10" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Save
        </Button>
      </div>
    </form>
  );
}

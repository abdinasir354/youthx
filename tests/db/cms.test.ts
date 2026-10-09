/**
 * CMS security tests (Youthup prompt §41): roles, publishing rights, private applications,
 * anonymous access, and privilege escalation. Runs against a real Supabase database.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anon, createUser, dbConfigured, deleteUsers, must, service, tag, type TestUser } from "./helpers";

const userIds: string[] = [];
const cleanup: { table: string; id: string }[] = [];
let youth: TestUser, editor: TestUser, contentAdmin: TestUser, programManager: TestUser;
let draftProgram = "", publishedProgram = "", volunteerApp = "";

async function track(u: Promise<TestUser>) {
  const user = await u;
  userIds.push(user.id);
  return user;
}

function remember<T extends { id: string }>(table: string, row: T) {
  cleanup.push({ table, id: row.id });
  return row.id;
}

describe.skipIf(!dbConfigured)("CMS security", () => {
  beforeAll(async () => {
    [youth, editor, contentAdmin, programManager] = await Promise.all([
      track(createUser("cms-youth")),
      track(createUser("cms-editor", { adminRole: "editor" })),
      track(createUser("cms-content", { adminRole: "content_admin" })),
      track(createUser("cms-pm", { adminRole: "program_manager" })),
    ]);
    const db = service();
    draftProgram = remember("programs", must(await db.from("programs").insert({ title: `Draft ${tag}`, slug: `draft-${tag}`, status: "draft" }).select("id").single(), "draft program"));
    publishedProgram = remember("programs", must(await db.from("programs").insert({ title: `Live ${tag}`, slug: `live-${tag}`, status: "published" }).select("id").single(), "live program"));
    volunteerApp = remember(
      "volunteer_applications",
      must(await db.from("volunteer_applications").insert({ full_name: `Vol ${tag}`, email: `vol-${tag}@example.com`, motivation: "I would like to help young people learn." }).select("id").single(), "volunteer app"),
    );
  });

  afterAll(async () => {
    const db = service();
    for (const { table, id } of cleanup.reverse()) await db.from(table).delete().eq("id", id);
    await db.from("admin_users").delete().in("user_id", userIds);
    await deleteUsers(userIds);
  });

  describe("anonymous visitors", () => {
    it("read published content but not drafts", async () => {
      const visitor = anon();
      expect((await visitor.from("programs").select("id").eq("id", publishedProgram)).data).toHaveLength(1);
      expect((await visitor.from("programs").select("id").eq("id", draftProgram)).data).toEqual([]);
    });

    it("cannot modify CMS content", async () => {
      const visitor = anon();
      const ins = await visitor.from("programs").insert({ title: "Hack", slug: `hack-${tag}`, status: "published" });
      expect(ins.error).not.toBeNull();
      await visitor.from("programs").update({ title: "Hacked" }).eq("id", publishedProgram);
      const { data } = await service().from("programs").select("title").eq("id", publishedProgram).single();
      expect(data?.title).toBe(`Live ${tag}`);
      const nav = await visitor.from("navigation_items").insert({ menu: "header", label: "x", href: "/x" });
      expect(nav.error).not.toBeNull();
      const settings = await visitor.from("site_settings").update({ site_name: "Hacked" }).eq("id", 1).select("id");
      expect(settings.data ?? []).toEqual([]);
    });

    it("cannot read applications, messages, subscribers, admin users or the audit log", async () => {
      const visitor = anon();
      for (const table of ["volunteer_applications", "mentor_applications", "contact_messages", "newsletter_subscribers", "admin_users", "audit_log", "media"]) {
        const { data } = await visitor.from(table).select("*").limit(5);
        expect(data ?? [], table).toEqual([]);
      }
    });

    it("can submit a volunteer application but not read it back or pre-approve it", async () => {
      const visitor = anon();
      const { error } = await visitor.from("volunteer_applications").insert({ full_name: `Anon ${tag}`, email: `anon-${tag}@example.com`, motivation: "I want to volunteer at events.", status: "approved" });
      expect(error).toBeNull();
      const { data } = await service().from("volunteer_applications").select("id, status").eq("email", `anon-${tag}@example.com`).single();
      expect(data?.status).toBe("new"); // the trigger forces the initial status
      cleanup.push({ table: "volunteer_applications", id: data!.id });
    });

    it("cannot download private CVs", async () => {
      const { data } = await anon().storage.from("applications").list("volunteer");
      expect(data ?? []).toEqual([]);
    });
  });

  describe("normal users", () => {
    it("cannot read CMS drafts or private applications", async () => {
      expect((await youth.client.from("programs").select("id").eq("id", draftProgram)).data).toEqual([]);
      expect((await youth.client.from("volunteer_applications").select("id").eq("id", volunteerApp)).data).toEqual([]);
    });

    it("cannot make themselves an admin", async () => {
      const { error } = await youth.client.from("admin_users").insert({ user_id: youth.id, role: "super_admin" });
      expect(error).not.toBeNull();
      const { data } = await service().from("admin_users").select("user_id").eq("user_id", youth.id);
      expect(data).toEqual([]);
    });
  });

  describe("admin roles", () => {
    it("an editor can draft but not publish", async () => {
      const draft = await editor.client.from("programs").insert({ title: `Editor ${tag}`, slug: `editor-${tag}` }).select("id, status").single();
      expect(draft.error).toBeNull();
      cleanup.push({ table: "programs", id: draft.data!.id });
      expect(draft.data!.status).toBe("draft");

      const publish = await editor.client.from("programs").update({ status: "published" }).eq("id", draft.data!.id);
      expect(publish.error?.message).toMatch(/publish/i);
    });

    it("a content admin can publish", async () => {
      const { error } = await contentAdmin.client.from("programs").update({ status: "published" }).eq("id", draftProgram);
      expect(error).toBeNull();
      await service().from("programs").update({ status: "draft" }).eq("id", draftProgram);
    });

    it("editors can't do super-admin things", async () => {
      // site settings, admin roles, audit log, applications
      const settings = await editor.client.from("site_settings").update({ site_name: "Editor was here" }).eq("id", 1).select("id");
      expect(settings.data ?? []).toEqual([]);
      const promote = await editor.client.from("admin_users").update({ role: "super_admin" }).eq("user_id", editor.id);
      expect((promote.data ?? []) as unknown[]).toEqual([]);
      const { data: still } = await service().from("admin_users").select("role").eq("user_id", editor.id).single();
      expect(still?.role).toBe("editor");
      expect((await editor.client.from("audit_log").select("id").limit(1)).data ?? []).toEqual([]);
      expect((await editor.client.from("volunteer_applications").select("id").eq("id", volunteerApp)).data).toEqual([]);
    });

    it("a program manager can review applications but not change their own role", async () => {
      expect((await programManager.client.from("volunteer_applications").select("id").eq("id", volunteerApp)).data).toHaveLength(1);
      const { error } = await programManager.client.from("volunteer_applications").update({ status: "under_review" }).eq("id", volunteerApp);
      expect(error).toBeNull();
      const self = await programManager.client.from("admin_users").update({ role: "super_admin" }).eq("user_id", programManager.id).select("role");
      expect(self.data ?? []).toEqual([]);
    });

    it("content changes are written to the audit log", async () => {
      const { data } = await service().from("audit_log").select("action, entity").eq("entity_id", publishedProgram);
      expect((data ?? []).some((a) => a.action === "create" && a.entity === "programs")).toBe(true);
    });
  });
});

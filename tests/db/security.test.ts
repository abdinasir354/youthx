/**
 * Security + quota tests against a real Supabase database (Section 11 of the spec).
 *
 * Every test signs in as a real user so RLS policies, triggers and accept_application()
 * are exercised exactly as the app uses them. Fixtures are created with a random tag and
 * removed in afterAll. Prefer running against a local stack (`supabase start`) — see README.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anon, createUser, dbConfigured, deleteUsers, must, service, tag, type TestUser } from "./helpers";

const userIds: string[] = [];
const oppIds: string[] = [];
const orgIds: string[] = [];
let donationId = "";
let contactId = "";
let draftPostId = "";
let cvPath = "";

let youthA: TestUser, youthB: TestUser, partner1: TestUser, partner2: TestUser, admin1: TestUser, admin2: TestUser;
let org1 = "", org2 = "";
let oppOpen = "", oppDraft = "";
let appA = "", appB = "";

async function track(user: Promise<TestUser>) {
  const u = await user;
  userIds.push(u.id);
  return u;
}

async function createOpp(fields: Record<string, unknown>) {
  const row = must(
    await service()
      .from("opportunities")
      .insert({ type: "training", title: `Test ${tag}`, slug: `test-${tag}-${oppIds.length}`, status: "published", ...fields })
      .select("id")
      .single(),
    "create opportunity",
  );
  oppIds.push(row.id);
  return row.id as string;
}

async function applyAsService(opportunityId: string, applicantId: string) {
  const row = must(
    await service().from("applications").insert({ opportunity_id: opportunityId, applicant_id: applicantId }).select("id").single(),
    "apply",
  );
  return row.id as string;
}

describe.skipIf(!dbConfigured)("database security & quota", () => {
  beforeAll(async () => {
    const db = service();
    [youthA, youthB, partner1, partner2, admin1, admin2] = await Promise.all([
      track(createUser("youth-a", { gender: "female" })),
      track(createUser("youth-b", { gender: "female" })),
      track(createUser("partner-1", { role: "partner", gender: "male" })),
      track(createUser("partner-2", { role: "partner", gender: "female" })),
      track(createUser("admin-1", { adminRole: "program_manager", gender: "female" })),
      track(createUser("admin-2", { adminRole: "program_manager", gender: "male" })),
    ]);

    // Organizations: the org_owner trigger makes created_by the owner.
    const orgs = must(
      await db
        .from("organizations")
        .insert([
          { name: `Org One ${tag}`, slug: `org-one-${tag}`, is_verified: true, created_by: partner1.id },
          { name: `Org Two ${tag}`, slug: `org-two-${tag}`, is_verified: true, created_by: partner2.id },
        ])
        .select("id, created_by"),
      "create orgs",
    );
    org1 = orgs.find((o) => o.created_by === partner1.id)!.id;
    org2 = orgs.find((o) => o.created_by === partner2.id)!.id;
    orgIds.push(org1, org2);

    oppOpen = await createOpp({ organization_id: org1, capacity: 20 });
    oppDraft = await createOpp({ organization_id: org1, capacity: 20, status: "draft" });

    // Youth apply through their own sessions (exercises the insert policy + trigger).
    appA = must(await youthA.client.from("applications").insert({ opportunity_id: oppOpen, applicant_id: youthA.id }).select("id").single(), "youthA apply").id;
    appB = must(await youthB.client.from("applications").insert({ opportunity_id: oppOpen, applicant_id: youthB.id }).select("id").single(), "youthB apply").id;

    cvPath = `${youthB.id}/cv-${tag}.pdf`;
    must(
      await db.storage.from("cvs").upload(cvPath, new Blob(["%PDF-1.4 test"], { type: "application/pdf" }), { contentType: "application/pdf" }),
      "upload cv",
    );
    must(await db.from("profiles").update({ cv_path: cvPath, phone: "+252610000000", date_of_birth: "2000-01-01" }).eq("id", youthB.id), "set cv");

    donationId = must(await db.from("donations").insert({ donor_name: `Donor ${tag}`, amount: 10, method: "evc_plus" }).select("id").single(), "donation").id;
    contactId = must(await db.from("contact_messages").insert({ name: `Contact ${tag}`, message: "hello" }).select("id").single(), "contact").id;
    draftPostId = must(
      await db.from("posts").insert({ title: `Draft ${tag}`, slug: `draft-${tag}`, is_published: false }).select("id").single(),
      "draft post",
    ).id;
  });

  afterAll(async () => {
    const db = service();
    if (oppIds.length) await db.from("opportunities").delete().in("id", oppIds);
    if (orgIds.length) await db.from("organizations").delete().in("id", orgIds);
    if (cvPath) await db.storage.from("cvs").remove([cvPath]);
    if (donationId) await db.from("donations").delete().eq("id", donationId);
    if (contactId) await db.from("contact_messages").delete().eq("id", contactId);
    if (draftPostId) await db.from("posts").delete().eq("id", draftPostId);
    await deleteUsers(userIds);
  });

  describe("youth privacy", () => {
    it("cannot read another youth's profile", async () => {
      const { data, error } = await youthA.client.from("profiles").select("id, gender, phone, date_of_birth").eq("id", youthB.id);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("cannot read another youth's application", async () => {
      const { data } = await youthA.client.from("applications").select("id").eq("id", appB);
      expect(data).toEqual([]);
      const own = await youthA.client.from("applications").select("id").eq("id", appA);
      expect(own.data).toHaveLength(1);
    });

    it("cannot read another youth's CV", async () => {
      const signed = await youthA.client.storage.from("cvs").createSignedUrl(cvPath, 60);
      expect(signed.data?.signedUrl).toBeFalsy();
      const download = await youthA.client.storage.from("cvs").download(cvPath);
      expect(download.data).toBeNull();
    });

    it("cannot read private fields through the public mentor view", async () => {
      const { data } = await youthA.client.from("public_mentors").select("*").limit(1);
      for (const row of data ?? []) {
        expect(row).not.toHaveProperty("gender");
        expect(row).not.toHaveProperty("phone");
        expect(row).not.toHaveProperty("date_of_birth");
      }
    });
  });

  describe("youth cannot escalate", () => {
    it("cannot change their own role", async () => {
      await youthA.client.from("profiles").update({ role: "admin", is_mentor_approved: true }).eq("id", youthA.id);
      const { data } = await service().from("profiles").select("role, is_mentor_approved").eq("id", youthA.id).single();
      expect(data).toEqual({ role: "youth", is_mentor_approved: false });
    });

    it("cannot set their application to accepted", async () => {
      const { error } = await youthA.client.from("applications").update({ status: "accepted" }).eq("id", appA);
      expect(error).not.toBeNull();
      const { data } = await service().from("applications").select("status").eq("id", appA).single();
      expect(data?.status).toBe("submitted");
    });

    it("cannot call accept_application", async () => {
      const { error } = await youthA.client.rpc("accept_application", { app_id: appA });
      expect(error).not.toBeNull();
    });

    it("can withdraw their own application", async () => {
      const own = await createOpp({ organization_id: org2, capacity: 5 });
      const id = must(await youthA.client.from("applications").insert({ opportunity_id: own, applicant_id: youthA.id }).select("id").single(), "apply").id;
      const { error } = await youthA.client.from("applications").update({ status: "withdrawn" }).eq("id", id);
      expect(error).toBeNull();
    });
  });

  describe("partner scope", () => {
    it("sees applicants of their own organization only", async () => {
      const mine = await partner1.client.from("applications").select("id").eq("opportunity_id", oppOpen);
      expect(mine.data?.map((r) => r.id).sort()).toEqual([appA, appB].sort());

      const other = await partner2.client.from("applications").select("id").eq("opportunity_id", oppOpen);
      expect(other.data).toEqual([]);
    });

    it("cannot read profiles of people who did not apply to them", async () => {
      const { data } = await partner2.client.from("profiles").select("id").eq("id", youthA.id);
      expect(data).toEqual([]);
    });

    it("cannot accept applicants of another organization", async () => {
      const { error } = await partner2.client.rpc("accept_application", { app_id: appA });
      expect(error).not.toBeNull();
    });

    it("cannot publish an opportunity", async () => {
      const { error } = await partner1.client
        .from("opportunities")
        .insert({ organization_id: org1, created_by: partner1.id, type: "job", title: "x", slug: `pub-${tag}`, status: "published" });
      expect(error).not.toBeNull();

      const upd = await partner1.client.from("opportunities").update({ status: "published" }).eq("id", oppDraft);
      expect(upd.error).not.toBeNull();
      const { data } = await service().from("opportunities").select("status").eq("id", oppDraft).single();
      expect(data?.status).toBe("draft");
    });

    it("cannot change female_ratio", async () => {
      const created = await partner1.client
        .from("opportunities")
        .insert({ organization_id: org1, created_by: partner1.id, type: "job", title: "x", slug: `ratio-${tag}`, female_ratio: 0.5, status: "draft" })
        .select("id, female_ratio")
        .single();
      expect(created.error).toBeNull();
      oppIds.push(created.data!.id);
      expect(Number(created.data!.female_ratio)).toBe(0.75);

      await partner1.client.from("opportunities").update({ female_ratio: 0.1, allow_rollover: true }).eq("id", oppDraft);
      const { data } = await service().from("opportunities").select("female_ratio, allow_rollover").eq("id", oppDraft).single();
      expect(Number(data?.female_ratio)).toBe(0.75);
      expect(data?.allow_rollover).toBe(false);
    });
  });

  describe("75/25 quota", () => {
    it("with capacity 20, the 16th woman and the 6th man are waitlisted", async () => {
      const opp = await createOpp({ organization_id: org1, capacity: 20 });
      const women = await Promise.all(Array.from({ length: 16 }, (_, i) => track(createUser(`w${i}`, { gender: "female", signIn: false }))));
      const men = await Promise.all(Array.from({ length: 6 }, (_, i) => track(createUser(`m${i}`, { gender: "male", signIn: false }))));

      const womenApps = await Promise.all(women.map((u) => applyAsService(opp, u.id)));
      const menApps = await Promise.all(men.map((u) => applyAsService(opp, u.id)));

      const womenResults: string[] = [];
      for (const id of womenApps) womenResults.push(must(await partner1.client.rpc("accept_application", { app_id: id }), "accept"));
      const menResults: string[] = [];
      for (const id of menApps) menResults.push(must(await partner1.client.rpc("accept_application", { app_id: id }), "accept"));

      expect(womenResults.slice(0, 15).every((r) => r === "accepted")).toBe(true);
      expect(womenResults[15]).toBe("waitlisted");
      expect(menResults.slice(0, 5).every((r) => r === "accepted")).toBe(true);
      expect(menResults[5]).toBe("waitlisted");

      const seats = must(await anon().rpc("public_seats", { opp }), "seats");
      expect(seats).toEqual([{ capacity: 20, female_seats: 15, male_seats: 5, female_left: 0, male_left: 0 }]);
    });

    it("two staff accepting at the same moment cannot exceed capacity", async () => {
      const opp = await createOpp({ organization_id: org1, capacity: 4 }); // 3 women / 1 man
      const people = await Promise.all(
        Array.from({ length: 8 }, (_, i) => track(createUser(`race${i}`, { gender: i % 2 ? "male" : "female", signIn: false }))),
      );
      const apps = await Promise.all(people.map((u) => applyAsService(opp, u.id)));

      // Fire every accept at once, split across two admin sessions.
      await Promise.all(apps.map((id, i) => (i % 2 ? admin1 : admin2).client.rpc("accept_application", { app_id: id })));

      const { data } = await service().from("applications").select("status, gender_snapshot").eq("opportunity_id", opp);
      const accepted = (data ?? []).filter((a) => a.status === "accepted");
      expect(accepted).toHaveLength(4);
      expect(accepted.filter((a) => a.gender_snapshot === "female")).toHaveLength(3);
      expect(accepted.filter((a) => a.gender_snapshot === "male")).toHaveLength(1);
    });

    it("requires gender before applying", async () => {
      const noGender = await track(createUser("nogender", { gender: null }));
      const { error } = await noGender.client.from("applications").insert({ opportunity_id: oppOpen, applicant_id: noGender.id });
      expect(error?.message).toMatch(/gender/i);
    });

    it("keeps gender_snapshot when the profile gender changes", async () => {
      await service().from("profiles").update({ gender: "male" }).eq("id", youthB.id);
      const { data } = await service().from("applications").select("gender_snapshot").eq("id", appB).single();
      expect(data?.gender_snapshot).toBe("female");
      await service().from("profiles").update({ gender: "female" }).eq("id", youthB.id);
    });
  });

  describe("anonymous visitors", () => {
    it("can read published opportunities but not drafts", async () => {
      const visitor = anon();
      const open = await visitor.from("opportunities").select("id").eq("id", oppOpen);
      expect(open.data).toHaveLength(1);
      const draft = await visitor.from("opportunities").select("id").eq("id", oppDraft);
      expect(draft.data).toEqual([]);
    });

    it("cannot read draft posts, donations, contact messages or profiles", async () => {
      const visitor = anon();
      expect((await visitor.from("posts").select("id").eq("id", draftPostId)).data).toEqual([]);
      expect((await visitor.from("donations").select("id").eq("id", donationId)).data ?? []).toEqual([]);
      expect((await visitor.from("contact_messages").select("id").eq("id", contactId)).data ?? []).toEqual([]);
      expect((await visitor.from("profiles").select("id").eq("id", youthA.id)).data ?? []).toEqual([]);
    });

    it("cannot read applications or the audit log", async () => {
      const visitor = anon();
      expect((await visitor.from("applications").select("id").eq("id", appA)).data ?? []).toEqual([]);
      expect((await visitor.from("audit_log").select("id").limit(1)).data ?? []).toEqual([]);
    });
  });
});

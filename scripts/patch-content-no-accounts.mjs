// One-off content update (2026-10-09): the site no longer has visitor accounts or courses.
// Merges new text into existing live sections (keeps uploaded photos), inserts the
// "approach" panels on Home, and updates the header button. Run once:
//   node scripts/patch-content-no-accounts.mjs
import { writeFileSync } from "node:fs";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const db = createClient(url, key, { auth: { persistSession: false } });

const OFFER = [
  { icon: "graduation-cap", title: "Academic support & education", body: "Helping young people stay in school and transition to higher education." },
  { icon: "laptop", title: "Practical skills", body: "Hands-on technology, digital literacy, and technical workshops." },
  { icon: "users", title: "Professional mentorship", body: "Guidance and investment from experienced industry leaders." },
  { icon: "briefcase", title: "Career development", body: "Job readiness, career planning, and access to growth opportunities." },
  { icon: "lightbulb", title: "Entrepreneurship support", body: "Turning innovative ideas into viable startup ventures." },
  { icon: "heart-handshake", title: "Youth-led community initiatives", body: "Programs that directly strengthen local communities." },
];
const APPROACH = {
  type: "cards",
  anchor: "approach",
  data: {
    eyebrow: "Our unique approach",
    heading: "Inclusive progress, built in person.",
    style: "statement",
    items: [
      { icon: "users", title: "75% young women · 25% young men", body: "Our programs are designed to support 75% young women and 25% young men, engaging them together as partners and allies in building a brighter future." },
      { icon: "map-pin", title: "In-person workshops", body: "We do not offer traditional classroom courses. Instead, we deliver high-impact, in-person workshops and practical training programs." },
    ],
  },
};
const GET_IN_TOUCH = {
  tone: "dark",
  heading: "Get in touch.",
  body: "We are built on real-world connection and collaboration. If you are a young person looking to join our next workshop, a professional wanting to mentor, or a partner looking to collaborate, we want to hear from you.",
  primary_cta: { label: "Contact us", href: "/contact" },
  secondary_cta: { label: "Get involved", href: "/get-involved" },
};

const backup = {};
async function sections(slug) {
  const { data: page } = await db.from("pages").select("id").eq("slug", slug).single();
  const { data } = await db.from("page_sections").select("id, type, anchor, position, data").eq("page_id", page.id).order("position");
  backup[slug] = data;
  return { pageId: page.id, list: data };
}
async function merge(row, patch) {
  const { error } = await db.from("page_sections").update({ data: { ...row.data, ...patch } }).eq("id", row.id);
  if (error) throw new Error(error.message);
}

// ---- Home ----
{
  const { pageId, list } = await sections("home");
  const hero = list.find((s) => s.type === "hero");
  if (hero) await merge(hero, { secondary_cta: { label: "Contact us", href: "/contact" } });
  const about = list.find((s) => s.type === "image_text" && s.anchor === "about");
  if (about)
    await merge(about, {
      heading: "Welcome to Youthup Foundation.",
      body: "At Youthup Foundation, we drive sustainable impact across Somalia by creating actionable pathways for the next generation to learn, grow, connect, and lead.\n\nWe work with high school students, university students, recent graduates, young professionals, young entrepreneurs, and youth seeking skills and opportunities.",
    });
  const offer = list.find((s) => s.type === "cards" && !s.anchor);
  if (offer) await merge(offer, { eyebrow: "What we offer", heading: "Practical pathways to learn, grow, connect, and lead.", items: OFFER });
  const stats = list.find((s) => s.type === "statistics");
  if (stats) await merge(stats, { items: (stats.data.items ?? []).filter((i) => !["youth_registered", "mentors", "courses", "accepted_total"].includes(i.metric)) });
  const ctas = list.filter((s) => s.type === "cta");
  const last = ctas[ctas.length - 1];
  if (last) await merge(last, GET_IN_TOUCH);
  // Insert the approach panels right after "About Youthup" (once).
  if (about && !list.some((s) => s.anchor === "approach")) {
    for (const s of list.filter((x) => x.position > about.position).reverse()) {
      await db.from("page_sections").update({ position: s.position + 1 }).eq("id", s.id);
    }
    const { error } = await db.from("page_sections").insert({ page_id: pageId, type: APPROACH.type, anchor: APPROACH.anchor, position: about.position + 1, data: APPROACH.data });
    if (error) throw new Error(error.message);
  }
  console.log("home updated");
}

// ---- About: drop member-based numbers ----
{
  const { list } = await sections("about");
  const stats = list.find((s) => s.type === "statistics");
  if (stats) await merge(stats, { items: (stats.data.items ?? []).filter((i) => !["youth_registered", "mentors", "courses", "accepted_total"].includes(i.metric)) });
  console.log("about updated");
}

// ---- Get Involved: no accounts ----
{
  const { list } = await sections("get-involved");
  const ways = list.find((s) => s.anchor === "ways");
  if (ways)
    await merge(ways, {
      items: (ways.data.items ?? []).map((it) =>
        it.link?.href === "/signup"
          ? { icon: "calendar", title: "Join a workshop", body: "Want to take part in our next in-person workshop or training? Get in touch and we'll let you know.", link: { label: "Contact us", href: "/contact?type=programs" } }
          : it,
      ),
    });
  console.log("get-involved updated");
}

// ---- Mentorship page: request a mentor through Contact ----
{
  const { list } = await sections("program-mentorship");
  const how = list.find((s) => s.anchor === "how-it-works");
  if (how)
    await merge(how, {
      items: [
        { title: "Apply", body: "Professionals apply through our Become a Mentor form." },
        { title: "Review", body: "Our team reviews each mentor application." },
        { title: "Match", body: "We match young people with a mentor whose experience fits their goals." },
        { title: "Grow", body: "Mentors and mentees meet regularly and work towards agreed goals." },
      ],
    });
  const who = list.find((s) => s.anchor === "participants");
  if (who)
    await merge(who, {
      body: "Students, recent graduates, young professionals, and young entrepreneurs who want guidance on their education, career, or business can contact us — we will match you with a suitable mentor.",
    });
  const cta = list.filter((s) => s.type === "cta").pop();
  if (cta) await merge(cta, { secondary_cta: { label: "Request a mentor", href: "/contact?type=programs&subject=Mentorship%20request" } });
  console.log("program-mentorship updated");
}

// ---- Header button ----
{
  const { error } = await db.from("site_settings").update({ header_cta_label: "Contact us", header_cta_href: "/contact" }).eq("id", 1);
  console.log(error ? `settings: ${error.message}` : "header button → Contact us");
}

const file = `supabase/content/backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
writeFileSync(file, JSON.stringify(backup, null, 2));
console.log(`backup of previous sections: ${file}`);

// Refresh the running site's cache.
const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
try {
  const res = await fetch(`${site}/api/revalidate`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify({ tags: ["pages", "settings"] }) });
  console.log(res.ok ? "site cache refreshed" : `site refresh failed (HTTP ${res.status})`);
} catch {
  console.log("site not running — changes appear after the next start");
}

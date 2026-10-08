-- ============================================================================
-- Initial CMS content for YouthX Foundation.
--
-- REAL CONTENT ONLY: mission, vision, values, programs and audiences come from the
-- foundation's brief. There are no invented people, events, statistics, partners,
-- projects or stories — those sections stay hidden (or show an empty state) until
-- staff add real entries in the admin.
--
-- Idempotent: re-running skips anything that already exists.
-- ============================================================================

-- ---------- navigation ----------
insert into public.navigation_items (menu, label, href, position)
select * from (values
  ('header', 'Home', '/', 0),
  ('header', 'About', '/about', 1),
  ('header', 'Programs', '/programs', 2),
  ('header', 'Opportunities', '/opportunities', 3),
  ('header', 'Events', '/events', 4),
  ('header', 'Contact', '/contact', 5),
  ('footer', 'About', '/about', 0),
  ('footer', 'Programs', '/programs', 1),
  ('footer', 'Opportunities', '/opportunities', 2),
  ('footer', 'Events', '/events', 3),
  ('footer', 'Get Involved', '/get-involved', 4),
  ('footer', 'Contact', '/contact', 5),
  ('legal', 'Privacy Policy', '/privacy', 0),
  ('legal', 'Terms of Use', '/terms', 1)
) v(menu, label, href, position)
where not exists (select 1 from public.navigation_items);

-- ---------- program categories + programs ----------
insert into public.program_categories (name, slug, position) values
  ('Education', 'education', 0),
  ('Skills', 'skills', 1),
  ('Mentorship & Leadership', 'mentorship-leadership', 2),
  ('Careers & Enterprise', 'careers-enterprise', 3),
  ('Community', 'community', 4)
on conflict (slug) do nothing;

insert into public.programs (title, slug, short_description, category_id, target_audience, status, is_featured, position, seo_description)
select v.title, v.slug, v.short_description, c.id, v.audience, 'published', v.featured, v.position, v.short_description
from (values
  ('Education & Academic Support', 'education-academic-support',
   'Support for students to stay in school, succeed academically, and reach higher education.',
   'education', 'High school students, university students', true, 0),
  ('Digital Skills & Technology', 'digital-skills-technology',
   'Practical digital and technology skills that open doors to study, work, and innovation.',
   'skills', 'Students, recent graduates, young professionals', true, 1),
  ('Workshops & Training', 'workshops-training',
   'Hands-on workshops and short trainings that build practical, job-ready skills.',
   'skills', 'Youth seeking skills and opportunities', false, 2),
  ('Mentorship', 'mentorship',
   'Connecting young people with experienced professionals who guide their growth.',
   'mentorship-leadership', 'Students, recent graduates, young professionals', true, 3),
  ('Leadership Development', 'leadership-development',
   'Building confident, responsible young leaders ready to drive positive change.',
   'mentorship-leadership', 'Youth who want to lead in their communities', false, 4),
  ('Career Development', 'career-development',
   'Helping young people plan careers, prepare for work, and find opportunities.',
   'careers-enterprise', 'University students, recent graduates, young professionals', false, 5),
  ('Entrepreneurship & Innovation', 'entrepreneurship-innovation',
   'Supporting young entrepreneurs to turn ideas into sustainable ventures.',
   'careers-enterprise', 'Young entrepreneurs', false, 6),
  ('Community Development', 'community-development',
   'Engaging youth in initiatives that strengthen their communities.',
   'community', 'All young people', false, 7)
) v(title, slug, short_description, category, audience, featured, position)
join public.program_categories c on c.slug = v.category
on conflict (slug) do nothing;

-- ---------- pages ----------
-- Helper: create a page and its sections in one statement (skipped when the slug exists).
create or replace function pg_temp.add_page(p_slug text, p_title text, p_description text, p_seo text, p_sections jsonb)
returns void language plpgsql as $$
declare pid uuid; s jsonb; i int := 0;
begin
  insert into public.pages (slug, title, description, is_system, status, seo_description)
  values (p_slug, p_title, p_description, true, 'published', p_seo)
  on conflict (slug) do nothing
  returning id into pid;
  if pid is null then return; end if;
  for s in select * from jsonb_array_elements(p_sections) loop
    insert into public.page_sections (page_id, type, anchor, position, data)
    values (pid, s->>'type', s->>'anchor', i, coalesce(s->'data', '{}'::jsonb));
    i := i + 1;
  end loop;
end $$;

-- HOME
select pg_temp.add_page('home', 'Home', null,
  'YouthX Foundation empowers Somali youth through education, skills, mentorship, career development, entrepreneurship, and community initiatives.',
$j$[
  {"type": "hero", "data": {
    "eyebrow": "YouthX Foundation",
    "heading": "Empowering Somali Youth. Building a Better Future.",
    "subheading": "We empower Somali youth to learn, grow, connect, and lead through education, practical skills, mentorship, career development, entrepreneurship, and community initiatives.",
    "primary_cta": {"label": "Explore Our Programs", "href": "/programs"},
    "secondary_cta": {"label": "Join YouthX", "href": "/get-involved"}
  }},
  {"type": "image_text", "anchor": "about", "data": {
    "eyebrow": "About YouthX",
    "heading": "A youth-focused organization for Somali young people",
    "body": "YouthX Foundation is dedicated to empowering Somali young people through education, skills development, mentorship, career development, entrepreneurship, leadership, and community engagement.\n\nWe work with high school students, university students, recent graduates, young professionals, young entrepreneurs, and youth seeking skills and opportunities.",
    "image_side": "right",
    "cta": {"label": "Learn about us", "href": "/about"}
  }},
  {"type": "cards", "data": {
    "eyebrow": "What we do",
    "heading": "Pathways to learn, grow, connect, and lead",
    "columns": 3,
    "items": [
      {"icon": "graduation-cap", "title": "Education", "body": "Academic support that helps young people stay in school and reach higher education."},
      {"icon": "laptop", "title": "Practical skills", "body": "Digital, technology, and hands-on skills through workshops and training."},
      {"icon": "users", "title": "Mentorship", "body": "Guidance from experienced professionals who invest in young people's growth."},
      {"icon": "briefcase", "title": "Career development", "body": "Career planning, job readiness, and access to opportunities."},
      {"icon": "lightbulb", "title": "Entrepreneurship", "body": "Support for young entrepreneurs turning ideas into ventures."},
      {"icon": "heart-handshake", "title": "Community", "body": "Youth-led initiatives that strengthen communities across Somalia."}
    ]
  }},
  {"type": "program_grid", "data": {
    "eyebrow": "Programs", "heading": "Featured programs", "mode": "featured", "limit": 6,
    "hide_when_empty": true, "cta": {"label": "View all programs", "href": "/programs"}
  }},
  {"type": "opportunity_grid", "data": {
    "eyebrow": "Opportunities", "heading": "Open opportunities", "mode": "latest", "limit": 3,
    "empty_text": "There are no open opportunities right now. Check back soon.",
    "cta": {"label": "Browse opportunities", "href": "/opportunities"}
  }},
  {"type": "event_grid", "data": {
    "eyebrow": "Events", "heading": "Upcoming events", "mode": "latest", "limit": 3,
    "empty_text": "No upcoming events at the moment.",
    "cta": {"label": "See all events", "href": "/events"}
  }},
  {"type": "image_text", "anchor": "mentorship", "data": {
    "eyebrow": "Mentorship",
    "heading": "Learn from people who have walked the path",
    "body": "Our mentorship program connects young people with experienced professionals for guidance on education, careers, and leadership.\n\nProfessionals who want to give back can apply to become a YouthX mentor.",
    "image_side": "left",
    "cta": {"label": "Become a mentor", "href": "/get-involved/mentor"}
  }},
  {"type": "statistics", "data": {
    "eyebrow": "Impact", "heading": "Our work so far",
    "hide_when_zero": true,
    "items": [
      {"metric": "programs", "label": "Active programs"},
      {"metric": "opportunities", "label": "Opportunities shared"},
      {"metric": "events", "label": "Events"},
      {"metric": "youth_registered", "label": "Youth members"}
    ]
  }},
  {"type": "project_grid", "data": {"eyebrow": "Projects", "heading": "Featured projects", "mode": "featured", "limit": 3, "hide_when_empty": true}},
  {"type": "story_grid", "data": {"eyebrow": "Youth stories", "heading": "Stories from our community", "mode": "featured", "limit": 3, "hide_when_empty": true}},
  {"type": "cta", "data": {
    "tone": "light",
    "heading": "Partner with YouthX",
    "body": "We work with organizations that share our commitment to Somali youth. Let's build opportunities together.",
    "primary_cta": {"label": "Become a partner", "href": "/get-involved/partner"},
    "secondary_cta": {"label": "Sponsor a program", "href": "/get-involved/sponsor"}
  }},
  {"type": "cta", "data": {
    "tone": "accent",
    "heading": "Get involved",
    "body": "Volunteer your time, mentor a young person, or support our programs.",
    "primary_cta": {"label": "Volunteer", "href": "/get-involved/volunteer"},
    "secondary_cta": {"label": "All ways to help", "href": "/get-involved"}
  }},
  {"type": "cta", "data": {
    "tone": "dark",
    "heading": "Be part of the next generation of Somali leaders",
    "body": "Create a free account to apply for opportunities, join courses, and connect with mentors.",
    "primary_cta": {"label": "Join YouthX", "href": "/signup"},
    "secondary_cta": {"label": "Contact us", "href": "/contact"}
  }}
]$j$::jsonb);

-- ABOUT
select pg_temp.add_page('about', 'About YouthX Foundation',
  'Empowering Somali young people through education, skills development, mentorship, career development, entrepreneurship, leadership, and community engagement.',
  'Who we are, our mission, vision, values, and the young people we serve.',
$j$[
  {"type": "rich_text", "anchor": "who-we-are", "data": {
    "eyebrow": "Who we are", "heading": "A youth-focused organization",
    "body": "YouthX Foundation is a youth-focused organization dedicated to empowering Somali young people through education, skills development, mentorship, career development, entrepreneurship, leadership, and community engagement."
  }},
  {"type": "rich_text", "anchor": "purpose", "data": {
    "eyebrow": "Our purpose", "heading": "Opening doors for young people",
    "body": "Young people are Somalia's greatest strength. We exist to make sure they have the knowledge, skills, guidance, and opportunities to build their own futures and lead positive change in their communities."
  }},
  {"type": "cards", "anchor": "mission-vision", "data": {
    "columns": 2,
    "items": [
      {"icon": "target", "title": "Mission", "body": "To empower Somali youth with the knowledge, skills, mentorship, and opportunities they need to succeed in education, careers, entrepreneurship, and community development."},
      {"icon": "eye", "title": "Vision", "body": "A skilled, educated, confident, and empowered generation of Somali youth leading positive change and building a stronger future for Somalia."}
    ]
  }},
  {"type": "rich_text", "anchor": "approach", "data": {
    "eyebrow": "Our approach", "heading": "Learn, grow, connect, lead",
    "body": "We combine education, practical skills, mentorship, and access to opportunities. Young people **learn** through programs and training, **grow** with the guidance of mentors, **connect** with peers, professionals, and organizations, and **lead** initiatives in their own communities."
  }},
  {"type": "cards", "anchor": "values", "data": {
    "eyebrow": "Core values", "heading": "What guides our work", "columns": 4,
    "items": [
      {"icon": "sparkles", "title": "Empowerment"},
      {"icon": "graduation-cap", "title": "Education"},
      {"icon": "flag", "title": "Leadership"},
      {"icon": "lightbulb", "title": "Innovation"},
      {"icon": "shield-check", "title": "Integrity"},
      {"icon": "door-open", "title": "Opportunity"},
      {"icon": "users", "title": "Community"}
    ]
  }},
  {"type": "cards", "anchor": "who-we-serve", "data": {
    "eyebrow": "Who we serve", "heading": "Young people at every stage", "columns": 3,
    "items": [
      {"icon": "school", "title": "High school students"},
      {"icon": "graduation-cap", "title": "University students"},
      {"icon": "award", "title": "Recent graduates"},
      {"icon": "briefcase", "title": "Young professionals"},
      {"icon": "lightbulb", "title": "Young entrepreneurs"},
      {"icon": "compass", "title": "Youth seeking skills and opportunities"}
    ]
  }},
  {"type": "cards", "anchor": "leadership", "data": {"eyebrow": "Leadership", "heading": "Our team", "columns": 4, "items": []}},
  {"type": "statistics", "anchor": "impact", "data": {
    "eyebrow": "Impact", "heading": "Our work so far", "hide_when_zero": true,
    "items": [
      {"metric": "programs", "label": "Active programs"},
      {"metric": "opportunities", "label": "Opportunities shared"},
      {"metric": "youth_registered", "label": "Youth members"},
      {"metric": "mentors", "label": "Mentors"}
    ]
  }},
  {"type": "partner_logos", "anchor": "partners", "data": {"eyebrow": "Partners", "heading": "Organizations we work with"}},
  {"type": "story_grid", "anchor": "stories", "data": {"eyebrow": "Youth stories", "heading": "Stories from our community", "mode": "latest", "limit": 3, "hide_when_empty": true}},
  {"type": "cta", "data": {
    "tone": "dark", "heading": "Join us in building a better future",
    "primary_cta": {"label": "Get involved", "href": "/get-involved"},
    "secondary_cta": {"label": "Contact us", "href": "/contact"}
  }}
]$j$::jsonb);

-- PROGRAMS / OPPORTUNITIES / EVENTS listing pages (the list itself is built in; sections below it are optional)
select pg_temp.add_page('programs', 'Our Programs',
  'Education, skills, mentorship, leadership, careers, entrepreneurship, and community — programs designed for Somali youth.',
  'Programs from YouthX Foundation for Somali youth.',
$j$[
  {"type": "resource_grid", "data": {"eyebrow": "Resources", "heading": "Guides and learning materials", "mode": "featured", "limit": 3, "hide_when_empty": true}},
  {"type": "project_grid", "data": {"eyebrow": "Projects", "heading": "Projects", "mode": "featured", "limit": 3, "hide_when_empty": true}},
  {"type": "story_grid", "data": {"eyebrow": "Youth stories", "heading": "Stories from our programs", "mode": "latest", "limit": 3, "hide_when_empty": true}}
]$j$::jsonb);

select pg_temp.add_page('opportunities', 'Opportunities',
  'Scholarships, internships, fellowships, training, jobs, and more for Somali youth.',
  'Scholarships, internships, fellowships, training, competitions, and jobs for Somali youth.',
$j$[
  {"type": "resource_grid", "data": {"eyebrow": "Resources", "heading": "Prepare your application", "mode": "featured", "limit": 3, "hide_when_empty": true}}
]$j$::jsonb);

select pg_temp.add_page('events', 'Events',
  'Workshops, trainings, webinars, and gatherings for Somali youth.',
  'Upcoming and past YouthX Foundation events.', '[]'::jsonb);

-- GET INVOLVED
select pg_temp.add_page('get-involved', 'Get Involved',
  'There are many ways to support Somali youth — give your time, share your experience, or partner with us.',
  'Volunteer, become a mentor, partner with us, or support YouthX Foundation.',
$j$[
  {"type": "cards", "anchor": "ways", "data": {
    "columns": 3,
    "items": [
      {"icon": "hand-heart", "title": "Volunteer", "body": "Share your time and skills to support our programs and events.", "link": {"label": "Apply to volunteer", "href": "/get-involved/volunteer"}},
      {"icon": "users", "title": "Become a Mentor", "body": "Guide a young person in their education, career, or business.", "link": {"label": "Apply to mentor", "href": "/get-involved/mentor"}},
      {"icon": "handshake", "title": "Partner With Us", "body": "Work with us to create programs and opportunities for youth.", "link": {"label": "Partnership inquiry", "href": "/get-involved/partner"}},
      {"icon": "award", "title": "Sponsor a Program", "body": "Fund a program, scholarship, training, or event.", "link": {"label": "Sponsorship inquiry", "href": "/get-involved/sponsor"}},
      {"icon": "heart-handshake", "title": "Support YouthX", "body": "Make a contribution that helps us reach more young people.", "link": {"label": "Support us", "href": "/donate"}},
      {"icon": "user-plus", "title": "Join the Community", "body": "Create a free account to apply for opportunities and join courses.", "link": {"label": "Create an account", "href": "/signup"}}
    ]
  }},
  {"type": "faq", "data": {"heading": "Questions", "category": "get-involved"}},
  {"type": "cta", "data": {
    "tone": "light", "heading": "Have another idea?",
    "body": "We'd love to hear how you'd like to support Somali youth.",
    "primary_cta": {"label": "Contact us", "href": "/contact"}
  }}
]$j$::jsonb);

-- CONTACT (contact details come from Site Settings)
select pg_temp.add_page('contact', 'Contact Us',
  'Questions, partnership ideas, or media inquiries — we would like to hear from you.',
  'Contact YouthX Foundation.', '[]'::jsonb);

-- MENTORSHIP program page sections (shown on /programs/mentorship below the program details)
select pg_temp.add_page('program-mentorship', 'Mentorship program page',
  'Extra sections shown on the Mentorship program page.', null,
$j$[
  {"type": "rich_text", "anchor": "purpose", "data": {
    "eyebrow": "Purpose", "heading": "Why mentorship matters",
    "body": "Many young people make important decisions about education and careers without someone to ask for advice. Our mentorship program connects Somali youth with experienced professionals who can share knowledge, open networks, and help them grow with confidence."
  }},
  {"type": "cards", "anchor": "how-it-works", "data": {
    "eyebrow": "How it works", "heading": "The mentorship process", "columns": 4, "style": "numbered",
    "items": [
      {"title": "Apply", "body": "Mentors apply online. Youth sign up for a free account."},
      {"title": "Review", "body": "Our team reviews each mentor application."},
      {"title": "Match", "body": "Young people request a mentor whose experience fits their goals."},
      {"title": "Grow", "body": "Mentors and mentees meet regularly and work towards agreed goals."}
    ]
  }},
  {"type": "rich_text", "anchor": "mentor-requirements", "data": {
    "eyebrow": "For mentors", "heading": "Who can become a mentor",
    "body": "We welcome professionals, entrepreneurs, and community leaders who:\n\n- have experience in their field they are willing to share\n- can commit time regularly to a mentee\n- treat young people with respect, patience, and confidentiality"
  }},
  {"type": "rich_text", "anchor": "participants", "data": {
    "eyebrow": "For young people", "heading": "Who can join",
    "body": "Students, recent graduates, young professionals, and young entrepreneurs who want guidance on their education, career, or business can join by creating a free YouthX account and requesting a mentor."
  }},
  {"type": "cards", "anchor": "benefits", "data": {
    "eyebrow": "Benefits", "heading": "What mentorship offers", "columns": 3,
    "items": [
      {"icon": "compass", "title": "Direction", "body": "Clearer goals for education and career."},
      {"icon": "network", "title": "Networks", "body": "Introductions to people and opportunities."},
      {"icon": "sparkles", "title": "Confidence", "body": "Support and encouragement from someone who has been there."}
    ]
  }},
  {"type": "faq", "anchor": "faq", "data": {"heading": "Frequently asked questions", "category": "mentorship"}},
  {"type": "cta", "data": {
    "tone": "dark", "heading": "Ready to get started?",
    "primary_cta": {"label": "Apply to become a mentor", "href": "/get-involved/mentor"},
    "secondary_cta": {"label": "Find a mentor", "href": "/dashboard/mentorship"}
  }}
]$j$::jsonb);

-- LEGAL (placeholders where official information is not yet available)
select pg_temp.add_page('privacy', 'Privacy Policy', null, 'How YouthX Foundation collects and uses personal information.',
$j$[
  {"type": "rich_text", "data": {"width": "narrow", "body": "> **Draft.** This policy describes how this website handles personal information. YouthX Foundation will publish its official legal details here: **[Official organization name and contact address — to be added by an administrator]**.\n\n## Information we collect\n\n- **Account information** you give us when you sign up: name, email address, and the profile details you choose to add.\n- **Applications** you submit for opportunities, volunteering, or mentorship, including any CV you upload.\n- **Messages** you send through our contact and partnership forms.\n- **Newsletter subscriptions**: your email address and subscription status.\n\n## How we use it\n\nWe use this information to run our programs, review applications, respond to messages, and send newsletters you have asked for. Partner organizations can see applications only for their own opportunities.\n\n## How we protect it\n\nCVs and applications are stored privately and are only available to authorized staff. Access to personal information is restricted by role.\n\n## Your choices\n\nYou can update your profile at any time, withdraw an application, and unsubscribe from the newsletter using the link in any email. To ask for your data to be deleted, contact us.\n\n## Cookies\n\nWe use essential cookies to keep you signed in. We do not use advertising cookies.\n\n## Contact\n\nQuestions about this policy can be sent through our contact page."}}
]$j$::jsonb);

select pg_temp.add_page('terms', 'Terms of Use', null, 'Terms for using the YouthX Foundation website.',
$j$[
  {"type": "rich_text", "data": {"width": "narrow", "body": "> **Draft.** These terms will be finalized by YouthX Foundation. Official organization details: **[to be added by an administrator]**.\n\n## Using this website\n\nBy using this website you agree to use it lawfully and respectfully. Do not submit false information, impersonate others, or attempt to access accounts or data that are not yours.\n\n## Accounts\n\nYou are responsible for keeping your password safe and for activity on your account.\n\n## Applications\n\nSubmitting an application does not guarantee acceptance. Opportunities listed from other organizations are managed by those organizations; please read their terms before applying.\n\n## Content\n\nContent on this website is provided for information. We may update or remove content at any time.\n\n## Changes\n\nWe may update these terms. The latest version will always be published on this page."}}
]$j$::jsonb);

-- ---------- first super admin ----------
-- The foundation's account becomes super admin as soon as it exists. If the account is
-- created after this migration runs, run the same statement in the SQL editor.
insert into public.admin_users (user_id, role)
select id, 'super_admin' from auth.users where lower(email) = 'youthxfoundation@gmail.com'
on conflict (user_id) do nothing;

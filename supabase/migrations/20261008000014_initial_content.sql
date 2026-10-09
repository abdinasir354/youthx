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
  ('header', 'Blog', '/blog', 3),
  ('header', 'Gallery', '/gallery', 4),
  ('footer', 'About', '/about', 0),
  ('footer', 'Programs', '/programs', 1),
  ('footer', 'Blog', '/blog', 2),
  ('footer', 'Gallery', '/gallery', 3),
  ('legal', 'Privacy Policy', '/privacy', 0),
  ('legal', 'Terms of Service', '/terms', 1),
  ('legal', 'Cookie Policy', '/cookies', 2)
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
    insert into public.page_sections (page_id, type, anchor, position, is_visible, data)
    values (pid, s->>'type', s->>'anchor', i, coalesce((s->>'is_visible')::boolean, true), coalesce(s->'data', '{}'::jsonb));
    i := i + 1;
  end loop;
end $$;

-- HOME
select pg_temp.add_page('home', 'Home', null,
  'YouthX Foundation empowers Somali youth through education, skills, mentorship, career development, entrepreneurship, and community initiatives.',
$j$[
  {
    "type": "hero",
    "data": {
      "eyebrow": "For every young Somali",
      "heading": "Empowering Somali youth.",
      "heading_accent": "Building a better future.",
      "subheading": "We empower Somali youth to learn, grow, connect, and lead through education, practical skills, mentorship, career development, entrepreneurship, and community initiatives.",
      "primary_cta": {
        "label": "Explore our programs",
        "href": "/programs"
      },
      "secondary_cta": {
        "label": "Contact us",
        "href": "/contact"
      },
      "stat_value": "15–35",
      "stat_label": "Your next chapter",
      "card_label": "Our mission",
      "card_text": "Learn. Grow. Connect."
    }
  },
  {
    "type": "image_text",
    "anchor": "about",
    "data": {
      "eyebrow": "About YouthX",
      "heading": "Welcome to YouthX Foundation.",
      "body": "At YouthX Foundation, we drive sustainable impact across Somalia by creating actionable pathways for the next generation to learn, grow, connect, and lead.\n\nWe work with high school students, university students, recent graduates, young professionals, young entrepreneurs, and youth seeking skills and opportunities.",
      "image_side": "left",
      "stat_value": "15–35",
      "stat_label": "The youth we serve",
      "cta": {
        "label": "Learn about us",
        "href": "/about"
      }
    }
  },
  {
    "type": "cards",
    "anchor": "approach",
    "data": {
      "eyebrow": "Our unique approach",
      "heading": "Inclusive progress, built in person.",
      "style": "statement",
      "items": [
        {
          "icon": "users",
          "title": "75% young women · 25% young men",
          "body": "Our programs are designed to support 75% young women and 25% young men, engaging them together as partners and allies in building a brighter future."
        },
        {
          "icon": "map-pin",
          "title": "In-person workshops",
          "body": "We do not offer traditional classroom courses. Instead, we deliver high-impact, in-person workshops and practical training programs."
        }
      ]
    }
  },
  {
    "type": "cards",
    "data": {
      "eyebrow": "What we offer",
      "heading": "Practical pathways to learn, grow, connect, and lead.",
      "columns": "3",
      "style": "plain",
      "items": [
        {
          "icon": "graduation-cap",
          "title": "Academic support & education",
          "body": "Helping young people stay in school and transition to higher education."
        },
        {
          "icon": "laptop",
          "title": "Practical skills",
          "body": "Hands-on technology, digital literacy, and technical workshops."
        },
        {
          "icon": "users",
          "title": "Professional mentorship",
          "body": "Guidance and investment from experienced industry leaders."
        },
        {
          "icon": "briefcase",
          "title": "Career development",
          "body": "Job readiness, career planning, and access to growth opportunities."
        },
        {
          "icon": "lightbulb",
          "title": "Entrepreneurship support",
          "body": "Turning innovative ideas into viable startup ventures."
        },
        {
          "icon": "heart-handshake",
          "title": "Youth-led community initiatives",
          "body": "Programs that directly strengthen local communities."
        }
      ]
    },
    "is_visible": false
  },
  {
    "type": "program_grid",
    "data": {
      "eyebrow": "Programs",
      "heading": "Featured programs.",
      "mode": "featured",
      "limit": 3,
      "hide_when_empty": true,
      "cta": {
        "label": "View all programs",
        "href": "/programs"
      }
    }
  },
  {
    "type": "opportunity_grid",
    "data": {
      "eyebrow": "Opportunities",
      "heading": "Open opportunities.",
      "mode": "latest",
      "limit": 3,
      "empty_text": "There are no open opportunities right now. Check back soon.",
      "cta": {
        "label": "Browse opportunities",
        "href": "/opportunities"
      }
    },
    "is_visible": false
  },
  {
    "type": "event_grid",
    "data": {
      "eyebrow": "Events",
      "heading": "Upcoming events.",
      "mode": "latest",
      "limit": 3,
      "empty_text": "No upcoming events at the moment.",
      "cta": {
        "label": "See all events",
        "href": "/events"
      }
    },
    "is_visible": false
  },
  {
    "type": "image_text",
    "anchor": "mentorship",
    "data": {
      "eyebrow": "Mentorship",
      "heading": "Learn from people who have walked the path.",
      "body": "Our mentorship program connects young people with experienced professionals for guidance on education, careers, and leadership.\n\nProfessionals who want to give back can apply to become a YouthX mentor.",
      "image_side": "right",
      "cta": {
        "label": "Become a mentor",
        "href": "/get-involved/mentor"
      }
    }
  },
  {
    "type": "statistics",
    "data": {
      "eyebrow": "Impact",
      "heading": "Our work so far.",
      "hide_when_zero": true,
      "items": [
        {
          "metric": "programs",
          "label": "Active programs"
        },
        {
          "metric": "opportunities",
          "label": "Opportunities shared"
        },
        {
          "metric": "events",
          "label": "Events"
        }
      ]
    }
  },
  {
    "type": "project_grid",
    "data": {
      "eyebrow": "Projects",
      "heading": "Featured projects.",
      "mode": "featured",
      "limit": 3,
      "hide_when_empty": true
    }
  },
  {
    "type": "story_grid",
    "data": {
      "eyebrow": "Stories of impact",
      "heading": "Stories from our community.",
      "mode": "featured",
      "limit": 3,
      "hide_when_empty": true
    }
  },
  {
    "type": "cta",
    "data": {
      "tone": "light",
      "heading": "Partner with YouthX.",
      "body": "We work with organizations that share our commitment to Somali youth. Let's build opportunities together.",
      "primary_cta": {
        "label": "Become a partner",
        "href": "/get-involved/partner"
      },
      "secondary_cta": {
        "label": "Sponsor a program",
        "href": "/get-involved/sponsor"
      }
    }
  },
  {
    "type": "cta",
    "data": {
      "tone": "dark",
      "heading": "Get in touch.",
      "body": "We are built on real-world connection and collaboration. If you are a young person looking to join our next workshop, a professional wanting to mentor, or a partner looking to collaborate, we want to hear from you.",
      "primary_cta": {
        "label": "Contact us",
        "href": "/contact"
      },
      "secondary_cta": {
        "label": "Get involved",
        "href": "/get-involved"
      }
    }
  }
]$j$::jsonb);

-- ABOUT
select pg_temp.add_page('about', 'About YouthX Foundation', 'Empowering Somali young people through education, skills development, mentorship, career development, entrepreneurship, leadership, and community engagement.',
  'Who we are, our mission, vision, values, and the young people we serve.',
$j$[
  {
    "type": "hero",
    "data": {
      "layout": "centered",
      "eyebrow": "Who we are",
      "heading": "Investing in the young people",
      "heading_accent": "who will lead Somalia.",
      "subheading": "YouthX Foundation is a youth-focused organization dedicated to empowering Somali young people through education, skills development, mentorship, career development, entrepreneurship, leadership, and community engagement.",
      "primary_cta": {
        "label": "Our programs",
        "href": "/programs"
      },
      "secondary_cta": {
        "label": "Get involved",
        "href": "/get-involved"
      },
      "facts": [
        {
          "value": "15–35",
          "label": "The youth we serve"
        },
        {
          "value": "Mogadishu",
          "label": "Where we're based"
        },
        {
          "value": "4 steps",
          "label": "Learn, grow, connect, lead"
        }
      ]
    }
  },
  {
    "type": "cards",
    "anchor": "mission-vision",
    "data": {
      "eyebrow": "Mission & vision",
      "heading": "Why we exist.",
      "style": "statement",
      "items": [
        {
          "icon": "target",
          "title": "Our mission",
          "body": "To empower Somali youth with the knowledge, skills, mentorship, and opportunities they need to succeed in education, careers, entrepreneurship, and community development."
        },
        {
          "icon": "eye",
          "title": "Our vision",
          "body": "A skilled, educated, confident, and empowered generation of Somali youth leading positive change and building a stronger future for Somalia."
        }
      ]
    }
  },
  {
    "type": "cards",
    "anchor": "approach",
    "data": {
      "eyebrow": "Our approach",
      "heading": "Learn, grow, connect, lead.",
      "intro": "We combine education, practical skills, mentorship, and access to opportunities.",
      "style": "numbered",
      "items": [
        {
          "title": "Learn",
          "body": "Through our programs, workshops, and training."
        },
        {
          "title": "Grow",
          "body": "With the guidance of experienced mentors."
        },
        {
          "title": "Connect",
          "body": "With peers, professionals, and organizations."
        },
        {
          "title": "Lead",
          "body": "Initiatives in their own communities."
        }
      ]
    }
  },
  {
    "type": "cards",
    "anchor": "journey",
    "data": {
      "eyebrow": "Our story",
      "heading": "Our journey.",
      "intro": "The milestones that shape YouthX Foundation.",
      "style": "timeline",
      "items": []
    }
  },
  {
    "type": "cards",
    "anchor": "values",
    "data": {
      "eyebrow": "Our guiding principles",
      "heading": "Core values.",
      "intro": "Seven principles guide every program, partnership, and decision we make.",
      "style": "bento",
      "items": [
        {
          "title": "Empowerment",
          "body": "Helping young people believe in and act on their own potential.",
          "icon": "sparkles"
        },
        {
          "title": "Education",
          "body": "Learning as the foundation for every opportunity.",
          "icon": "graduation-cap"
        },
        {
          "title": "Leadership",
          "body": "Preparing youth to lead change in their communities.",
          "icon": "flag"
        },
        {
          "title": "Innovation",
          "body": "Encouraging new ideas, skills, and ways of working.",
          "icon": "lightbulb"
        },
        {
          "title": "Integrity",
          "body": "Being honest, transparent, and accountable in all we do.",
          "icon": "shield-check"
        },
        {
          "title": "Opportunity",
          "body": "Opening doors to education, work, and enterprise.",
          "icon": "door-open"
        },
        {
          "title": "Community",
          "body": "Growing together and giving back.",
          "icon": "users"
        }
      ]
    }
  },
  {
    "type": "cards",
    "anchor": "who-we-serve",
    "data": {
      "eyebrow": "Who we serve",
      "heading": "Young people at every stage.",
      "style": "chips",
      "items": [
        {
          "icon": "school",
          "title": "High school students"
        },
        {
          "icon": "graduation-cap",
          "title": "University students"
        },
        {
          "icon": "award",
          "title": "Recent graduates"
        },
        {
          "icon": "briefcase",
          "title": "Young professionals"
        },
        {
          "icon": "lightbulb",
          "title": "Young entrepreneurs"
        },
        {
          "icon": "compass",
          "title": "Youth seeking skills and opportunities"
        }
      ]
    }
  },
  {
    "type": "cards",
    "anchor": "team",
    "data": {
      "eyebrow": "The people behind YouthX",
      "heading": "Meet our team.",
      "intro": "The dedicated people working every day for Somali youth.",
      "style": "team",
      "items": []
    }
  },
  {
    "type": "statistics",
    "anchor": "impact",
    "data": {
      "eyebrow": "Impact",
      "heading": "Our work so far.",
      "hide_when_zero": true,
      "items": [
        {
          "metric": "programs",
          "label": "Active programs"
        },
        {
          "metric": "opportunities",
          "label": "Opportunities shared"
        }
      ]
    }
  },
  {
    "type": "partner_logos",
    "anchor": "partners",
    "data": {
      "eyebrow": "Partners",
      "heading": "Organizations we work with."
    }
  },
  {
    "type": "story_grid",
    "anchor": "stories",
    "data": {
      "eyebrow": "Stories of impact",
      "heading": "Stories from our community.",
      "mode": "latest",
      "limit": 3,
      "hide_when_empty": true
    }
  },
  {
    "type": "cta",
    "data": {
      "tone": "accent",
      "heading": "Want to be part of the change?",
      "body": "Whether you volunteer, mentor, or partner with us, your involvement makes a real difference for Somali youth.",
      "primary_cta": {
        "label": "Get involved",
        "href": "/get-involved"
      },
      "secondary_cta": {
        "label": "Become a partner",
        "href": "/get-involved/partner"
      }
    }
  }
]$j$::jsonb);

-- PROGRAMS / OPPORTUNITIES / EVENTS listing pages (the list itself is built in; sections below it are optional)
select pg_temp.add_page('programs', 'Core programs & services.', 'Programs designed around the needs of Somali youth — from the classroom to a first job, a business, and leadership in the community.',
  'Programs from YouthX Foundation for Somali youth.',
$j$[
  {
    "type": "hero",
    "data": {
      "layout": "index",
      "eyebrow": "Our programs",
      "heading": "Learn. Grow.",
      "heading_accent": "Lead.",
      "subheading": "We empower Somali youth with the knowledge, skills, mentorship, and opportunities they need to succeed in education, careers, entrepreneurship, and community development.",
      "primary_cta": {
        "label": "Explore programs",
        "href": "/programs#programs"
      },
      "secondary_cta": {
        "label": "Get involved",
        "href": "/get-involved"
      },
      "card_label": "Browse by area"
    }
  },
  {
    "type": "resource_grid",
    "data": {
      "eyebrow": "Resources",
      "heading": "Guides and learning materials.",
      "mode": "featured",
      "limit": 3,
      "hide_when_empty": true
    }
  },
  {
    "type": "project_grid",
    "data": {
      "eyebrow": "Projects",
      "heading": "Our projects.",
      "mode": "featured",
      "limit": 3,
      "hide_when_empty": true
    }
  },
  {
    "type": "story_grid",
    "data": {
      "eyebrow": "Stories of impact",
      "heading": "Success stories.",
      "intro": "Real people, real change — shared with their permission.",
      "mode": "latest",
      "limit": 3,
      "hide_when_empty": true
    }
  },
  {
    "type": "cta",
    "data": {
      "tone": "dark",
      "heading": "Ready to make a difference?",
      "body": "Your involvement helps young Somalis learn, grow, and lead. Volunteer your time or partner with us.",
      "primary_cta": {
        "label": "Volunteer with us",
        "href": "/get-involved/volunteer"
      },
      "secondary_cta": {
        "label": "Become a partner",
        "href": "/get-involved/partner"
      }
    }
  }
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
      {"icon": "calendar", "title": "Join a workshop", "body": "Want to take part in our next in-person workshop or training? Get in touch and we'll let you know.", "link": {"label": "Contact us", "href": "/contact?type=programs"}}
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
select pg_temp.add_page('contact', 'Contact Us', 'Questions, partnership ideas, or media inquiries — we would like to hear from you.',
  'Contact YouthX Foundation.',
$j$[
  {
    "type": "hero",
    "data": {
      "eyebrow": "Contact",
      "heading": "Let's shape the future",
      "heading_accent": "together.",
      "image_alt": "YouthX Foundation"
    }
  }
]$j$::jsonb);

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
      {"title": "Apply", "body": "Professionals apply through our Become a Mentor form."},
      {"title": "Review", "body": "Our team reviews each mentor application."},
      {"title": "Match", "body": "We match young people with a mentor whose experience fits their goals."},
      {"title": "Grow", "body": "Mentors and mentees meet regularly and work towards agreed goals."}
    ]
  }},
  {"type": "rich_text", "anchor": "mentor-requirements", "data": {
    "eyebrow": "For mentors", "heading": "Who can become a mentor",
    "body": "We welcome professionals, entrepreneurs, and community leaders who:\n\n- have experience in their field they are willing to share\n- can commit time regularly to a mentee\n- treat young people with respect, patience, and confidentiality"
  }},
  {"type": "rich_text", "anchor": "participants", "data": {
    "eyebrow": "For young people", "heading": "Who can join",
    "body": "Students, recent graduates, young professionals, and young entrepreneurs who want guidance on their education, career, or business can contact us — we will match you with a suitable mentor."
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
    "secondary_cta": {"label": "Request a mentor", "href": "/contact?type=programs&subject=Mentorship%20request"}
  }}
]$j$::jsonb);

-- LEGAL (placeholders where official information is not yet available)
select pg_temp.add_page('privacy', 'Privacy Policy', null, 'How YouthX Foundation collects and uses personal information.',
$j$[
  {
    "type": "rich_text",
    "data": {
      "width": "narrow",
      "body": "> **Official details to be completed.** YouthX Foundation will add its registered legal name and official address here: **[to be added by an administrator]**. Last updated: October 2026.\n\n## 1. Who we are\n\nThis website is run by YouthX Foundation (\"YouthX\", \"we\", \"us\"), a youth-focused organization based in Mogadishu, Somalia. This policy explains what personal information we collect through this website, why we collect it, and how we protect it.\n\n## 2. Information we collect\n\nWe only collect information that you choose to send us:\n\n- **Contact messages** — your name, and optionally your email, phone number, subject, and message.\n- **Volunteer applications** — your name, email, phone, location, skills, interests, experience, availability, motivation, portfolio or LinkedIn link, and your CV if you upload one.\n- **Mentor applications** — your name, email, phone, professional field, organization, years of experience, skills, areas you can mentor in, availability, short bio, motivation, website or LinkedIn link, and your CV if you upload one.\n- **Partnership and sponsorship inquiries** — your organization's name, your name, email, phone, and message.\n- **Donation pledges** — the details you enter on the donation form, such as your name, contact details, amount, payment method, and reference. We do not collect or store card numbers.\n- **Newsletter sign-ups** — your email address and whether you are subscribed.\n\nWe do **not** offer visitor accounts. The only accounts on this website belong to authorized YouthX staff who manage its content.\n\n## 3. How we use your information\n\n- To read and reply to your messages.\n- To review volunteer and mentor applications and contact applicants.\n- To discuss partnerships, sponsorships, and donations.\n- To send the newsletter, only if you subscribed.\n- To keep the website secure and prevent spam and abuse.\n\nWe do not sell, rent, or trade your personal information, and we do not use it for advertising.\n\n## 4. Who can see your information\n\nOnly authorized YouthX staff can see the information you submit, and each staff role only sees what it needs (for example, applications are visible only to the staff who review them). CVs are stored privately and can only be opened by authorized staff through temporary, secure links.\n\nWe may share information if the law requires it, or with your permission (for example, introducing a mentor to a young person).\n\n## 5. Where and how your information is stored\n\nThe website and its database are hosted by trusted service providers (Supabase for the database and file storage). Information is sent over encrypted connections (HTTPS) and access is protected by role-based security rules.\n\n## 6. How long we keep it\n\nWe keep messages, applications, and inquiries only as long as needed to respond and to run our programs, after which they are archived or deleted. Newsletter subscribers can unsubscribe at any time using the link in every email.\n\n## 7. Your rights\n\nYou can ask us to:\n\n- tell you what information we hold about you,\n- correct information that is wrong,\n- delete your information,\n- stop sending you the newsletter.\n\nTo make a request, use our [contact page](/contact).\n\n## 8. Young people\n\nOur work focuses on young people aged 15–35. If you are under 18, please ask a parent or guardian before sending us personal information.\n\n## 9. Cookies\n\nWe only use cookies that are essential for the website to work and to remember your cookie choice. See our [Cookie Policy](/cookies) for details.\n\n## 10. Changes to this policy\n\nWe may update this policy from time to time. The latest version will always be published on this page.\n\n## 11. Contact\n\nIf you have questions about this policy or your information, please [contact us](/contact)."
    }
  }
]$j$::jsonb);

select pg_temp.add_page('terms', 'Terms of Service', null, 'Terms for using the YouthX Foundation website.',
$j$[
  {"type": "rich_text", "data": {"width": "narrow", "body": "> **Draft.** These terms will be finalized by YouthX Foundation. Official organization details: **[to be added by an administrator]**.\n\n## Using this website\n\nBy using this website you agree to use it lawfully and respectfully. Do not submit false information, impersonate others, or attempt to access accounts or data that are not yours.\n\n## Accounts\n\nYou are responsible for keeping your password safe and for activity on your account.\n\n## Applications\n\nSubmitting an application does not guarantee acceptance. Opportunities listed from other organizations are managed by those organizations; please read their terms before applying.\n\n## Content\n\nContent on this website is provided for information. We may update or remove content at any time.\n\n## Changes\n\nWe may update these terms. The latest version will always be published on this page."}}
]$j$::jsonb);

-- COOKIE POLICY + GALLERY (sections filled from supabase/content/pages.json)
select pg_temp.add_page('cookies', 'Cookie Policy', 'How YouthX Foundation uses cookies, and the choices you have.', 'How YouthX Foundation uses cookies.',
$j$[
  {
    "type": "rich_text",
    "data": {
      "width": "narrow",
      "body": "> Last updated: October 2026.\n\n## What are cookies?\n\nCookies are small text files that a website stores in your browser. They help a website work properly and can remember your choices.\n\n## Cookies we use\n\nWe keep cookies to a minimum. Today, this website **only uses essential cookies** — we do not use advertising cookies, and we do not use analytics or tracking cookies.\n\n| Cookie | Purpose | Type | How long |\n|---|---|---|---|\n| `yx_consent` | Remembers your cookie choice so we don't ask again | Essential | 12 months |\n| `NEXT_LOCALE` | Remembers the website language | Essential | Session / 12 months |\n| `sb-…-auth-token` | Keeps authorized staff signed in to the admin area (staff only) | Essential | Session |\n| `yx_admin` | Confirms a secure staff sign-in (staff only) | Essential | Session |\n\nEssential cookies are needed for the website to work and to keep it secure, so they cannot be switched off.\n\n## Your choices\n\nWhen you first visit, we ask you to choose:\n\n- **Accept all cookies** — allows essential cookies and any optional cookies we may add in the future (for example, privacy-friendly visitor statistics).\n- **Essential cookies only** — only the cookies the website needs to work.\n- **Reject all** — refuses every optional cookie. Essential cookies stay on because the website cannot work without them.\n\nYou can change your choice at any time using the **Cookie settings** link at the bottom of every page. You can also block or delete cookies in your browser settings.\n\n## Changes\n\nIf we ever add optional cookies, we will update this page and only use them with your consent.\n\n## Contact\n\nQuestions about cookies? Please [contact us](/contact)."
    }
  }
]$j$::jsonb);

select pg_temp.add_page('gallery', 'Gallery', 'Moments from our workshops, trainings, and community activities.', 'Photos from YouthX Foundation programs and events.',
$j$[
  {
    "type": "gallery",
    "data": {
      "heading": "Moments from our programs",
      "images": []
    }
  }
]$j$::jsonb);

-- ---------- first super admin ----------
-- The foundation's account becomes super admin as soon as it exists. If the account is
-- created after this migration runs, run the same statement in the SQL editor.
insert into public.admin_users (user_id, role)
select id, 'super_admin' from auth.users where lower(email) = 'youthxfoundation@gmail.com'
on conflict (user_id) do nothing;


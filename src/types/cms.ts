/** Public shapes of CMS content (what the website reads). */
import type { SectionType } from "@/lib/cms/sections";

export type ContentStatus = "draft" | "published" | "archived";

export interface Program {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  featured_image_url: string | null;
  gallery: string[];
  category_id: string | null;
  objectives: string[];
  target_audience: string | null;
  duration: string | null;
  location: string | null;
  registration_url: string | null;
  application_url: string | null;
  status: ContentStatus;
  is_featured: boolean;
  position: number;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  updated_at: string;
  category?: { name: string; slug: string } | null;
}

export interface EventSpeaker {
  name: string;
  role_title: string | null;
  bio: string | null;
  image_url: string | null;
}

export interface CmsEvent {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  description: string | null;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  attendance_mode: "in_person" | "online" | "hybrid";
  online_url: string | null;
  registration_url: string | null;
  featured_image_url: string | null;
  capacity: number | null;
  event_status: "upcoming" | "registration_open" | "ongoing" | "completed" | "cancelled";
  program_id: string | null;
  is_featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  updated_at: string;
  speakers?: EventSpeaker[];
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  description: string | null;
  problem: string | null;
  solution: string | null;
  objectives: string[];
  activities: string[];
  impact: string | null;
  project_status: "planned" | "active" | "ongoing" | "completed";
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  featured_image_url: string | null;
  gallery: string[];
  documents: { name: string; url: string }[];
  program_id: string | null;
  is_featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  updated_at: string;
  partners?: Partner[];
}

export interface Resource {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  body: string | null;
  resource_type: string;
  category_id: string | null;
  author: string | null;
  cover_image_url: string | null;
  file_url: string | null;
  external_url: string | null;
  program_id: string | null;
  is_featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  updated_at: string;
  category?: { name: string; slug: string } | null;
}

export interface Story {
  id: string;
  title: string;
  slug: string;
  person_name: string;
  introduction: string | null;
  body: string | null;
  profile_image_url: string | null;
  quote: string | null;
  program_id: string | null;
  is_featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  updated_at: string;
}

export interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  website: string | null;
  description: string | null;
}

export interface Faq {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface NavLink {
  id: string;
  label: string;
  href: string;
  open_in_new_tab: boolean;
}

export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: ContentStatus;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  updated_at: string;
}

export interface CmsSection {
  id: string;
  type: SectionType;
  anchor: string | null;
  data: Record<string, unknown>;
}

/**
 * Row types for the Supabase schema in supabase/migrations.
 * Hand-written to match the migrations; once your project is linked you can replace this
 * with generated types:  npx supabase gen types typescript --linked > src/types/supabase.ts
 */

/** Platform role chosen at signup / granted by staff. Back-office access is separate (AdminRole). */
export type UserRole = "youth" | "mentor" | "partner";
export type AdminRole = "super_admin" | "content_admin" | "program_manager" | "editor";
export type Gender = "female" | "male";
export type OpportunityType = "scholarship" | "internship" | "fellowship" | "training" | "competition" | "volunteering" | "conference" | "job" | "mentorship" | "grant" | "event" | "other";
export type OpportunityStatus = "draft" | "pending_review" | "published" | "closed" | "archived";
export type ApplicationStatus = "submitted" | "under_review" | "shortlisted" | "accepted" | "waitlisted" | "rejected" | "withdrawn";
export type EducationLevel = "none" | "primary" | "secondary" | "diploma" | "bachelor" | "master" | "other";

export const OPPORTUNITY_TYPES: OpportunityType[] = ["scholarship", "internship", "fellowship", "training", "competition", "volunteering", "conference", "job", "mentorship", "grant", "event", "other"];
export const OPPORTUNITY_STATUSES: OpportunityStatus[] = ["draft", "pending_review", "published", "closed", "archived"];
export const APPLICATION_STATUSES: ApplicationStatus[] = ["submitted", "under_review", "shortlisted", "accepted", "waitlisted", "rejected", "withdrawn"];
export const EDUCATION_LEVELS: EducationLevel[] = ["none", "primary", "secondary", "diploma", "bachelor", "master", "other"];
export const USER_ROLES: UserRole[] = ["youth", "mentor", "partner"];
export const ADMIN_ROLES: AdminRole[] = ["super_admin", "content_admin", "program_manager", "editor"];
export const REGIONS = ["Banadir", "Hiiraan", "Galmudug", "Puntland", "Jubaland", "South West", "Somaliland"] as const;

export interface Profile {
  id: string;
  email: string | null;
  full_name: string;
  role: UserRole;
  gender: Gender | null;
  date_of_birth: string | null;
  region: string | null;
  district: string | null;
  phone: string | null;
  education_level: EducationLevel | null;
  skills: string[];
  languages: string[];
  bio: string | null;
  avatar_url: string | null;
  cv_path: string | null;
  preferred_language: "so" | "en";
  is_mentor_approved: boolean;
  mentor_expertise: string[];
  mentor_availability: string | null;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  logo_url: string | null;
  website: string | null;
  description: string | null;
  is_verified: boolean;
  created_by: string | null;
  created_at: string;
}

export interface OpportunityQuestion {
  id: string;
  label: string;
  required: boolean;
}

export interface Opportunity {
  id: string;
  organization_id: string | null;
  organization_name: string | null;
  location: string | null;
  apply_mode: "internal" | "external";
  application_url: string | null;
  attachment_url: string | null;
  expires_at: string | null;
  is_featured: boolean;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  type: OpportunityType;
  title: string;
  slug: string;
  summary: string | null;
  description: string | null;
  requirements: string | null;
  region: string | null;
  is_remote: boolean;
  capacity: number | null;
  female_ratio: number;
  allow_rollover: boolean;
  rollover_applied: boolean;
  min_age: number | null;
  max_age: number | null;
  apply_deadline: string | null;
  starts_at: string | null;
  ends_at: string | null;
  cover_url: string | null;
  questions: OpportunityQuestion[];
  status: OpportunityStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  organization?: Pick<Organization, "id" | "name" | "slug" | "logo_url"> | null;
}

export interface Application {
  id: string;
  opportunity_id: string;
  applicant_id: string;
  gender_snapshot: Gender;
  status: ApplicationStatus;
  answers: Record<string, string>;
  cv_path: string | null;
  motivation: string | null;
  submitted_at: string;
  decided_at: string | null;
  decided_by: string | null;
}

export interface SeatInfo {
  opportunity_id?: string;
  capacity: number | null;
  female_seats: number | null;
  male_seats: number | null;
  female_left: number | null;
  male_left: number | null;
}

export interface OpportunitySeats {
  opportunity_id: string;
  capacity: number | null;
  female_ratio: number;
  rollover_applied: boolean;
  female_seats: number | null;
  male_seats: number | null;
  female_accepted: number;
  male_accepted: number;
  female_applied: number;
  male_applied: number;
  waitlisted: number;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  level: string | null;
  cover_url: string | null;
  language: string | null;
  is_published: boolean;
  created_at: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  position: number;
  duration_minutes: number | null;
}

export interface Post {
  id: string;
  kind: "news" | "story";
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  cover_url: string | null;
  language: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

export interface MentorshipRequest {
  id: string;
  mentee_id: string;
  mentor_id: string;
  topic: string | null;
  message: string | null;
  status: "pending" | "accepted" | "declined" | "completed" | "cancelled";
  response_message: string | null;
  created_at: string;
  responded_at: string | null;
}

export interface PublicMentor {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  skills: string[];
  languages: string[];
  region: string | null;
  mentor_expertise: string[];
  mentor_availability: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Donation {
  id: string;
  donor_name: string | null;
  donor_email: string | null;
  donor_phone: string | null;
  amount: number;
  currency: string;
  method: string | null;
  reference: string | null;
  message: string | null;
  is_anonymous: boolean;
  status: "pledged" | "confirmed" | "cancelled";
  created_at: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface PartnerRequest {
  id: string;
  org_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: "new" | "contacted" | "approved" | "declined";
  created_at: string;
}

export interface AuditEntry {
  id: number;
  actor_id: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface ImpactStats {
  youth_registered: number;
  youth_trained: number;
  jobs_placed: number;
  accepted_total: number;
  women_percent: number | null;
  opportunities: number;
  courses: number;
  partners: number;
}

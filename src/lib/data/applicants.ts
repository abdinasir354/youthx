import "server-only";
import { createClient } from "@/lib/supabase/server";
import { ageFromDob } from "@/lib/utils";
import type { Application, EducationLevel, Gender, Opportunity, OpportunitySeats } from "@/types/database.types";

export type ApplicantRow = Application & {
  applicant: {
    full_name: string;
    email: string | null;
    gender: Gender | null;
    date_of_birth: string | null;
    region: string | null;
    district: string | null;
    phone: string | null;
    education_level: EducationLevel | null;
    skills: string[];
    languages: string[];
  } | null;
  age: number | null;
  reviews: { id: string; score: number | null; notes: string | null; created_at: string }[];
};

/**
 * Applicants of one opportunity. Everything goes through the user's session, so RLS decides:
 * partners only see their own organization's opportunities and applicants; staff see all.
 */
export async function loadApplicants(opportunityId: string) {
  const supabase = await createClient();
  const { data: opportunity } = await supabase.from("opportunities").select("*").eq("id", opportunityId).maybeSingle();
  if (!opportunity) return null;

  const [{ data: seats }, { data: apps }] = await Promise.all([
    supabase.from("opportunity_seats").select("*").eq("opportunity_id", opportunityId).maybeSingle(),
    supabase
      .from("applications")
      .select(
        "*, applicant:profiles!applications_applicant_id_fkey(full_name, email, gender, date_of_birth, region, district, phone, education_level, skills, languages), reviews:application_reviews(id, score, notes, created_at)",
      )
      .eq("opportunity_id", opportunityId)
      .order("submitted_at", { ascending: true }),
  ]);

  const now = new Date();
  const applicants = ((apps as ApplicantRow[]) ?? []).map((a) => ({ ...a, age: ageFromDob(a.applicant?.date_of_birth, now) }));
  return { opportunity: opportunity as Opportunity, seats: seats as OpportunitySeats | null, applicants };
}

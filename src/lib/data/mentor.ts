import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MentorshipRequest } from "@/types/database.types";

export type MentorRequestRow = MentorshipRequest & {
  mentee: { full_name: string; region: string | null; education_level: string | null; skills: string[] } | null;
};

/** Requests addressed to this mentor, with the mentee's basic profile (allowed by "profiles: mentor read mentees"). */
export async function getMentorRequests(mentorId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mentorship_requests")
    .select("*, mentee:profiles!mentorship_requests_mentee_id_fkey(full_name, region, education_level, skills)")
    .eq("mentor_id", mentorId)
    .order("created_at", { ascending: false });
  return (data as MentorRequestRow[]) ?? [];
}

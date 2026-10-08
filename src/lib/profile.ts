import type { Profile } from "@/types/database.types";

/** Percentage of the profile wizard that is filled in. */
export function profileCompleteness(p: Profile) {
  const checks = [
    !!p.full_name,
    !!p.gender,
    !!p.date_of_birth,
    !!p.region,
    !!p.phone,
    !!p.education_level,
    p.skills.length > 0,
    p.languages.length > 0,
    !!p.bio,
    !!p.avatar_url,
    !!p.cv_path,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

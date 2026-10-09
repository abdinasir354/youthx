/** Volunteer + mentor application review screens (shared config). */

export const REVIEW_STATUSES = ["new", "under_review", "approved", "rejected", "archived"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export type ReviewKind = "volunteer" | "mentor";

export type ReviewField = { name: string; label: string; kind?: "text" | "list" | "url" | "long" | "email" | "phone" | "number" };

export const REVIEWS: Record<ReviewKind, { table: string; label: string; singular: string; path: string; listColumns: ReviewField[]; detail: ReviewField[] }> = {
  volunteer: {
    table: "volunteer_applications",
    label: "Volunteer applications",
    singular: "Volunteer application",
    path: "/admin/volunteers",
    listColumns: [
      { name: "location", label: "Location" },
      { name: "interests", label: "Interests", kind: "list" },
    ],
    detail: [
      { name: "email", label: "Email", kind: "email" },
      { name: "phone", label: "Phone", kind: "phone" },
      { name: "location", label: "Location" },
      { name: "skills", label: "Skills", kind: "list" },
      { name: "interests", label: "Areas of interest", kind: "list" },
      { name: "availability", label: "Availability" },
      { name: "portfolio_url", label: "Portfolio / LinkedIn", kind: "url" },
      { name: "experience", label: "Experience", kind: "long" },
      { name: "motivation", label: "Motivation", kind: "long" },
    ],
  },
  mentor: {
    table: "mentor_applications",
    label: "Mentor applications",
    singular: "Mentor application",
    path: "/admin/mentorship",
    listColumns: [
      { name: "professional_field", label: "Field" },
      { name: "organization", label: "Organization" },
    ],
    detail: [
      { name: "email", label: "Email", kind: "email" },
      { name: "phone", label: "Phone", kind: "phone" },
      { name: "professional_field", label: "Professional field" },
      { name: "organization", label: "Organization" },
      { name: "years_experience", label: "Years of experience", kind: "number" },
      { name: "skills", label: "Skills", kind: "list" },
      { name: "mentor_areas", label: "Can mentor in", kind: "list" },
      { name: "availability", label: "Availability" },
      { name: "website_url", label: "LinkedIn / website", kind: "url" },
      { name: "bio", label: "Short bio", kind: "long" },
      { name: "motivation", label: "Motivation", kind: "long" },
    ],
  },
};

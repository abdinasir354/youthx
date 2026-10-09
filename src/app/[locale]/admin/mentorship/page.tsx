import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { ReviewList } from "@/components/admin/review/review-views";

export const metadata: Metadata = { title: "Mentorship" };

export default async function MentorshipAdminPage({ searchParams }: PageProps<"/[locale]/admin/mentorship">) {
  return (
    <ReviewList
      kind="mentor"
      searchParams={(await searchParams) as Record<string, string | undefined>}
      intro={
        <>
          Applications from the “Become a Mentor” form. Approving an applicant who has a YouthX account makes them an approved mentor.{" "}
          <Link href="/admin/users?role=mentor" className="font-medium text-secondary underline">See approved mentors</Link> ·{" "}
          <Link href="/admin/pages" className="font-medium text-secondary underline">Edit the mentorship page</Link>
        </>
      }
    />
  );
}

import type { Metadata } from "next";
import { ReviewDetail } from "@/components/admin/review/review-views";

export const metadata: Metadata = { title: "Mentor application" };

export default async function MentorApplicationPage({ params }: PageProps<"/[locale]/admin/mentorship/[id]">) {
  const { id } = await params;
  return <ReviewDetail kind="mentor" id={id} />;
}

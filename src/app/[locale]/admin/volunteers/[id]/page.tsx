import type { Metadata } from "next";
import { ReviewDetail } from "@/components/admin/review/review-views";

export const metadata: Metadata = { title: "Volunteer application" };

export default async function VolunteerPage({ params }: PageProps<"/[locale]/admin/volunteers/[id]">) {
  const { id } = await params;
  return <ReviewDetail kind="volunteer" id={id} />;
}

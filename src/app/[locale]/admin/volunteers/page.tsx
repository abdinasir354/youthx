import type { Metadata } from "next";
import { ReviewList } from "@/components/admin/review/review-views";

export const metadata: Metadata = { title: "Volunteers" };

export default async function VolunteersPage({ searchParams }: PageProps<"/[locale]/admin/volunteers">) {
  return <ReviewList kind="volunteer" searchParams={(await searchParams) as Record<string, string | undefined>} intro="Applications from the Volunteer form on the Get Involved page." />;
}

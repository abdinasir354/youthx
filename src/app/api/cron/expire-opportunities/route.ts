import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, serviceRoleKey } from "@/lib/supabase/admin";

/**
 * Daily job (see vercel.json): closes published opportunities whose expiry date or deadline
 * has passed. Vercel sends `Authorization: Bearer $CRON_SECRET`; anything else gets 401.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!serviceRoleKey()) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { data, error } = await createAdminClient().rpc("close_expired_opportunities");
  if (error) return NextResponse.json({ error: "Failed" }, { status: 500 });
  if (Number(data) > 0) {
    revalidateTag("opportunities", "max");
    revalidateTag("stats", "max");
  }
  return NextResponse.json({ closed: Number(data ?? 0) });
}

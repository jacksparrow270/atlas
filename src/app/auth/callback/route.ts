import { NextResponse } from "next/server";
import { db, configured } from "@/lib/supabase/server";
export async function GET(req: Request) {
  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  if (code && configured()) {
    const client = await db();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(
          u.searchParams.get("next") === "/auth/update"
            ? "/auth/update"
            : "/dashboard",
          u.origin,
        ),
      );
  }
  return NextResponse.redirect(
    new URL(
      "/auth?error=The%20confirmation%20link%20expired.%20Please%20try%20again.",
      u.origin,
    ),
  );
}

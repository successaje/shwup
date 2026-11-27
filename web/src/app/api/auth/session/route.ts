import { currentUser, json, toPublicUser } from "@/lib/server/auth/http";
import { accountsEnabled } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/** Who is signed in, if anyone, and whether this deployment has accounts at all. */
export async function GET() {
  const user = await currentUser();
  return json({ enabled: accountsEnabled(), user: user ? toPublicUser(user) : null });
}

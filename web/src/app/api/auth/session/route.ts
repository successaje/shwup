import { currentUser, json, toPublicUser } from "@/lib/server/auth/http";

export const dynamic = "force-dynamic";

/** Who is signed in, if anyone. */
export async function GET() {
  const user = await currentUser();
  return json({ user: user ? toPublicUser(user) : null });
}

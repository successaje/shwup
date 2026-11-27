/** What the browser may see about a signed-in account. Email stays server-side. */
export type PublicUser = {
  id: string;
  address: string;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
};

import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OrganizerConsole } from "@/components/organizer/organizer-console";

export const metadata = { title: "Manage event" };

export default async function ManageEventPage({ params }: PageProps<"/app/events/[id]">) {
  const { id } = await params;
  if (!/^\d{1,20}$/.test(id)) notFound();
  return (
    <Suspense>
      <OrganizerConsole id={BigInt(id)} />
    </Suspense>
  );
}

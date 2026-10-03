import { notFound } from "next/navigation";
import { DoorMode } from "@/components/door/door-mode";

export const metadata = { title: "Door mode" };

export default async function DoorPage({ params }: PageProps<"/app/events/[id]/door">) {
  const { id } = await params;
  if (!/^\d{1,20}$/.test(id)) notFound();
  return <DoorMode id={BigInt(id)} />;
}

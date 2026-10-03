import { TicketStatus } from "@/domain/event";

const STATUS_TEXT: Record<TicketStatus, string> = {
  [TicketStatus.None]: "none",
  [TicketStatus.Held]: "holding",
  [TicketStatus.CheckedIn]: "checked in",
  [TicketStatus.Released]: "cancelled",
  [TicketStatus.Transferred]: "gave spot away",
};

const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Guest list as CSV for spreadsheets, name tags or follow-up emails. */
export function guestsCsv(rows: { address: string; status: TicketStatus; name?: string }[], { closed }: { closed: boolean }): string {
  const lines = [["name", "wallet", "status"].join(",")];
  for (const r of rows) {
    const status = closed && r.status === TicketStatus.Held ? "no-show" : STATUS_TEXT[r.status];
    lines.push([cell(r.name ?? ""), r.address, status].join(","));
  }
  return lines.join("\n") + "\n";
}

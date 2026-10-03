import { ImageResponse } from "next/og";

/** The ShwUp mark on ink, as a PNG. `pad` is the fraction of empty margin per side. */
export function renderAppIcon(size: number, pad: number, init?: ResponseInit) {
  const inner = Math.round(size * (1 - pad * 2));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#18170f" }}>
        <svg width={inner} height={inner} viewBox="0 0 24 24">
          <path
            fill="#d9481f"
            d="M4 4h16a1 1 0 0 1 1 1v4.2a2.8 2.8 0 0 0 0 5.6V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4.2a2.8 2.8 0 0 0 0-5.6V5a1 1 0 0 1 1-1Z"
          />
          <path stroke="#18170f" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="0.1 3" d="M15 6.5v11" />
        </svg>
      </div>
    ),
    { width: size, height: size, ...init },
  );
}

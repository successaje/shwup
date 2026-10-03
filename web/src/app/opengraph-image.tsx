import { ImageResponse } from "next/og";

export const alt = "ShwUp — RSVPs that mean it";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social card: the promise and the ticket stub, in the product's colors. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f4f1e8", padding: 80, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 600 }}>
          <div style={{ color: "#d9481f", fontSize: 30 }}>ShwUp · on Arc</div>
          <div style={{ fontSize: 96, fontWeight: 700, color: "#18170f", lineHeight: 1, marginTop: 24, letterSpacing: -3 }}>RSVPs that mean it.</div>
          <div style={{ fontSize: 34, color: "#57544a", marginTop: 32, lineHeight: 1.35 }}>
            Hold your spot with $5. Get it back the second you walk in.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: 340, background: "#fbfaf5", border: "2px solid #e0dbcc", borderRadius: 18, padding: 36 }}>
          <div style={{ color: "#d9481f", fontSize: 18, letterSpacing: 3 }}>ADMIT ONE</div>
          <div style={{ fontSize: 34, color: "#18170f", marginTop: 12 }}>Builders Night</div>
          <div style={{ borderTop: "2px dashed #c9c3b1", marginTop: 36, marginBottom: 28 }} />
          <div style={{ fontSize: 18, color: "#57544a" }}>Back in your wallet</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 60, color: "#157347" }}>$5.00</div>
            <div style={{ border: "3px solid #d9481f", color: "#d9481f", fontSize: 18, padding: "6px 10px", borderRadius: 6, transform: "rotate(-4deg)" }}>SHOWED UP</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/** Crisp SVG QR code. Rendered ink-on-surface so it scans in both light and dark mode. */
export function QrCode({ value, className, label }: { value: string; className?: string; label: string }) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(value, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#18170f", light: "#00000000" } })
      .then((s) => !cancelled && setSvg(s))
      .catch(() => !cancelled && setSvg(null));
    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <div
      role="img"
      aria-label={label}
      className={cn("rounded-sm bg-[#fbfaf5] p-2 [&_svg]:block [&_svg]:size-full", className)}
      // qrcode returns a self-contained SVG string built from `value`; no user HTML is injected.
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}

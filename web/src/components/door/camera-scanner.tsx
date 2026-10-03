"use client";

import { CameraOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type CameraState = "starting" | "on" | "denied" | "unavailable";

/** Rear camera QR scanner. Fails soft: if there's no camera, the manual entry below still works. */
export function CameraScanner({ onScan, paused, className }: { onScan: (text: string) => void; paused?: boolean; className?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<CameraState>("starting");
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let scanner: { start: () => Promise<void>; stop: () => void; destroy: () => void } | null = null;
    let cancelled = false;

    (async () => {
      const { default: QrScanner } = await import("qr-scanner");
      if (cancelled || !video.current) return;
      if (!(await QrScanner.hasCamera())) {
        setState("unavailable");
        return;
      }
      scanner = new QrScanner(video.current, (r) => onScanRef.current(r.data), {
        preferredCamera: "environment",
        maxScansPerSecond: 6,
        returnDetailedScanResult: true,
      });
      try {
        await scanner.start();
        if (!cancelled) setState("on");
      } catch (e) {
        if (!cancelled) setState(String(e).toLowerCase().includes("permission") || String(e).includes("NotAllowed") ? "denied" : "unavailable");
      }
    })();

    return () => {
      cancelled = true;
      scanner?.stop();
      scanner?.destroy();
    };
  }, []);

  return (
    <div className={cn("relative aspect-square w-full overflow-hidden rounded-lg bg-[#0d0c0b]", className)}>
      <video ref={video} className={cn("size-full object-cover transition-opacity", state === "on" ? "opacity-100" : "opacity-0", paused && "opacity-60")} muted playsInline />

      {state === "on" && (
        <div aria-hidden className="pointer-events-none absolute inset-[18%]">
          {["top-0 left-0 border-t-2 border-l-2", "top-0 right-0 border-t-2 border-r-2", "bottom-0 left-0 border-b-2 border-l-2", "right-0 bottom-0 border-r-2 border-b-2"].map((c) => (
            <span key={c} className={cn("absolute size-8 rounded-[3px] border-white/90", c)} />
          ))}
        </div>
      )}

      {state !== "on" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-white/70">
          {state === "starting" ? (
            <p>Starting camera…</p>
          ) : (
            <>
              <CameraOff className="size-6" />
              <p className="max-w-56">
                {state === "denied"
                  ? "Camera access was blocked. Allow it in your browser settings, or enter codes below."
                  : "No camera found. Enter ticket codes below, or check people in from the guest list."}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { Smartphone, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISSED = "shwup:install-hint-dismissed";
const noop = () => () => {};

function readContext() {
  if (typeof window === "undefined") return "server";
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
  if (standalone) return "installed";
  try {
    if (localStorage.getItem(DISMISSED)) return "dismissed";
  } catch {}
  const touch = window.matchMedia("(pointer: coarse)").matches;
  if (!touch) return "desktop";
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ? "ios" : "android";
}

/**
 * On phones, suggest installing ShwUp so door mode opens like an app. Uses the browser's install
 * prompt where available (Android/Chrome), and the Share → Add to Home Screen path on iOS.
 */
export function InstallHint() {
  const context = useSyncExternalStore(noop, readContext, () => "server");
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (hidden || (context !== "ios" && context !== "android") || (context === "android" && !prompt)) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISSED, "1");
    } catch {}
  };

  return (
    <div className="flex items-start gap-3 rounded-md border border-line bg-surface px-4 py-3 text-sm">
      <Smartphone className="mt-0.5 size-4 shrink-0 text-ink-3" />
      <div className="flex-1">
        <p className="font-medium">Keep ShwUp on this phone</p>
        {context === "ios" ? (
          <p className="mt-0.5 text-ink-2">Tap Share, then “Add to Home Screen”. Door mode opens full-screen, like an app.</p>
        ) : (
          <button
            onClick={async () => {
              await prompt?.prompt();
              setPrompt(null);
              setHidden(true);
            }}
            className="mt-1 font-medium text-ink underline underline-offset-4"
          >
            Install the app
          </button>
        )}
      </div>
      <button onClick={dismiss} aria-label="Dismiss" className="-m-1 grid size-8 place-items-center rounded-sm text-ink-3 hover:bg-sunken hover:text-ink">
        <X className="size-4" />
      </button>
    </div>
  );
}

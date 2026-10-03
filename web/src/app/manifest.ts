import type { MetadataRoute } from "next";

/** Installable as an app — mainly for organizers, whose phone becomes the door scanner. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShwUp — RSVPs that mean it",
    short_name: "ShwUp",
    description: "Refundable RSVP deposits on Arc. Hold your spot, get it back at the door.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f1e8",
    theme_color: "#f4f1e8",
    categories: ["events", "productivity", "finance"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "New event", url: "/app/new" },
      { name: "Activity", url: "/app/activity" },
    ],
  };
}

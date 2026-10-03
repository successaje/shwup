import { renderAppIcon } from "@/lib/app-icon";

const VARIANTS = { "192": { size: 192, pad: 0.18 }, "512": { size: 512, pad: 0.18 }, "maskable-512": { size: 512, pad: 0.3 } } as const;

/** PNG app icons for the web app manifest (manifest icons must be raster). */
export async function GET(_: Request, { params }: { params: Promise<{ variant: string }> }) {
  const { variant } = await params;
  const v = VARIANTS[variant as keyof typeof VARIANTS];
  if (!v) return new Response("Not found", { status: 404 });
  return renderAppIcon(v.size, v.pad, { headers: { "Cache-Control": "public, max-age=31536000, immutable" } });
}

import { AppHeader } from "@/components/layout/app-header";
import { ConfigGuard } from "@/components/layout/config-guard";

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-8 pb-24 sm:px-6 sm:pt-12">
        <ConfigGuard>{children}</ConfigGuard>
      </main>
    </>
  );
}

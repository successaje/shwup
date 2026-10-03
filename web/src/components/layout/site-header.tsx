import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { AccountButton } from "@/components/wallet/account-button";

/** Header for public pages (landing, guest event pages): brand, the app, and the wallet. */
export function SiteHeader({ showWallet = true }: { showWallet?: boolean }) {
  return (
    <header className="border-b border-line/70">
      <div className="mx-auto flex h-15 max-w-5xl items-center gap-3 px-4 sm:px-6">
        <Wordmark />
        <div className="ml-auto flex items-center gap-4">
          <Link href="/app" className="text-sm text-ink-2 hover:text-ink">
            Your events
          </Link>
          {showWallet && <AccountButton />}
        </div>
      </div>
    </header>
  );
}

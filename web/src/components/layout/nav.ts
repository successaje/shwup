/** Site navigation, shared by headers, the mobile menu and the footer. Absolute so links work from any page. */
export type NavItem = { href: string; label: string };

export const MARKETING_NAV: NavItem[] = [
  { href: "/#how", label: "How it works" },
  { href: "/#uses", label: "Use cases" },
  { href: "/#arc", label: "Why Arc" },
  { href: "/#faq", label: "FAQ" },
  { href: "/brand", label: "Brand" },
];

export const APP_NAV: NavItem[] = [
  { href: "/app", label: "Events" },
  { href: "/app/activity", label: "Activity" },
  { href: "/app/settings", label: "Settings" },
];

/** A nav item is current when the path matches it exactly (hash links are never "current"). */
export function isCurrent(item: NavItem, pathname: string): boolean {
  return !item.href.includes("#") && item.href === pathname;
}

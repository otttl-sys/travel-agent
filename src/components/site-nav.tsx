"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/user-nav";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/plan",       label: "Plan a trip" },
  { href: "/chat",       label: "Chat with AI" },
  { href: "/discover",   label: "Discover" },
  { href: "/explore",    label: "Explore" },
  { href: "/research",   label: "Research" },
  { href: "/budget",     label: "Budget" },
  { href: "/disruption", label: "Disruption" },
  { href: "/packing",    label: "Packing List" },
  { href: "/saved",      label: "Saved Trips" },
  { href: "/about",      label: "About" },
];

export function SiteNav({
  children,
  className,
  containerClassName = "max-w-5xl mx-auto flex items-center justify-between",
  sticky = true,
  noPrint = false,
}: {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  sticky?: boolean;
  noPrint?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "bg-background border-b border-border px-6 py-4 relative",
        sticky && "sticky top-0 z-50 backdrop-blur bg-background/95",
        noPrint && "no-print",
        className
      )}
    >
      <div className={containerClassName}>
        <Link href="/" className="font-bold text-foreground text-sm tracking-[0.2em] uppercase">
          Vagamundo
        </Link>

        {/* Desktop: children + UserNav + ThemeToggle */}
        <div className="hidden sm:flex items-center gap-4">
          {children}
          <UserNav />
          <ThemeToggle />
        </div>

        {/* Mobile: children (CTA buttons) + hamburger */}
        <div className="flex sm:hidden items-center gap-2">
          {children}
          <ThemeToggle />
          <button
            onClick={() => setOpen((o) => !o)}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? (
              <span className="text-xl leading-none">×</span>
            ) : (
              <span className="flex flex-col gap-[5px]">
                <span className="block w-5 h-0.5 bg-current" />
                <span className="block w-5 h-0.5 bg-current" />
                <span className="block w-5 h-0.5 bg-current" />
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="sm:hidden absolute top-full left-0 right-0 bg-background border-b border-border shadow-md z-50 px-6 py-5 flex flex-col gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "py-2.5 text-sm font-medium border-b border-border/50 last:border-0 transition-colors",
                pathname === href ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </Link>
          ))}
          <div className="pt-3">
            <UserNav />
          </div>
        </div>
      )}
    </nav>
  );
}

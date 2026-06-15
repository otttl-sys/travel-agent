import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export function SiteNav({
  children,
  className,
  containerClassName = "max-w-5xl mx-auto flex items-center justify-between",
  sticky = false,
  noPrint = false,
}: {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  sticky?: boolean;
  noPrint?: boolean;
}) {
  return (
    <nav
      className={cn(
        "bg-background border-b border-border px-6 py-4",
        sticky && "sticky top-0 z-50 backdrop-blur bg-background/95",
        noPrint && "no-print",
        className
      )}
    >
      <div className={containerClassName}>
        <Link href="/" className="font-bold text-foreground text-sm tracking-[0.2em] uppercase">
          TravelAgent
        </Link>
        <div className="flex items-center gap-3">
          {children}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}

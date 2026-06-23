import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";

export default function TripNotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav>
        <Link href="/plan"><Button size="sm">Plan a trip</Button></Link>
      </SiteNav>
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🗺️</div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-foreground mb-2">Trip not found</h1>
          <p className="text-sm text-muted-foreground mb-8">
            This link may have expired or the trip was deleted.
          </p>
          <Link href="/plan">
            <Button>Plan your own trip →</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

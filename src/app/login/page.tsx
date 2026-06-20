"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SiteNav } from "@/components/site-nav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const authError = searchParams.get("error");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav />
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-3">
              Your account
            </p>
            <h1 className="text-3xl font-heading font-extrabold tracking-[-0.03em] text-foreground mb-2">
              Sign in
            </h1>
            <p className="text-muted-foreground text-sm">
              We&apos;ll send a magic link to your email — no password needed.
            </p>
          </div>

          {authError && (
            <div className="mb-5 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-sm text-red-700 dark:text-red-400">
              Authentication failed. Please try again.
            </div>
          )}

          {sent ? (
            <div className="bg-surface border border-border rounded-2xl p-8 text-center">
              <span className="text-4xl mb-4 block">✉️</span>
              <h2 className="font-heading font-extrabold text-xl text-foreground mb-2">
                Check your inbox
              </h2>
              <p className="text-muted-foreground text-sm mb-5">
                We sent a magic link to <strong>{email}</strong>. Click the
                link to sign in.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-surface border border-border rounded-2xl p-8 space-y-5"
            >
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Email address
                </label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="text-base"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full bg-foreground text-background hover:bg-brand hover:text-brand-foreground"
              >
                {loading ? "Sending…" : "Send magic link →"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                No account needed — signing in creates one automatically.
              </p>
            </form>
          )}

          <p className="text-center text-xs text-muted-foreground mt-6">
            <Link href="/" className="hover:text-foreground transition-colors">
              ← Back to Vagamundo
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { Mail, Eye, EyeOff, Check, X } from "lucide-react";
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

type Mode = "signin" | "signup" | "forgot";

const PWD_RULES = [
  { id: "length",  label: "At least 8 characters",    test: (p: string) => p.length >= 8 },
  { id: "upper",   label: "One uppercase letter",      test: (p: string) => /[A-Z]/.test(p) },
  { id: "special", label: "One special character",     test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function passwordValid(p: string) {
  return PWD_RULES.every((r) => r.test(p));
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const authError = searchParams.get("error");

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pwdTouched, setPwdTouched] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup" && !passwordValid(password)) {
      setPwdTouched(true);
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    const supabase = createSupabaseBrowserClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message === "Invalid login credentials"
          ? "Wrong email or password."
          : error.message);
      } else {
        router.push(redirectTo);
        router.refresh();
      }

    } else if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setLoading(false);
      if (error) {
        setError(error.message);
      } else if (data.session) {
        router.push("/onboarding");
        router.refresh();
      } else {
        setSuccess("Account created — check your inbox to confirm your email, then sign in.");
        setMode("signin");
        setPassword("");
      }

    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        setSuccess("Password reset link sent — check your inbox.");
      }
    }
  }

  const titles: Record<Mode, { heading: string; sub: string; cta: string }> = {
    signin:  { heading: "Sign in",        sub: "Welcome back.",                           cta: loading ? "Signing in…"  : "Sign in →" },
    signup:  { heading: "Create account", sub: "Free — no credit card needed.",           cta: loading ? "Creating…"    : "Create account →" },
    forgot:  { heading: "Reset password", sub: "We'll send a reset link to your email.",  cta: loading ? "Sending…"     : "Send reset link →" },
  };

  const { heading, sub, cta } = titles[mode];
  const showRules = mode === "signup" && (pwdTouched || password.length > 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav />
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">

          <div className="mb-8">
            <p className="text-xs font-semibold text-brand uppercase tracking-[0.28em] mb-3">Your account</p>
            <h1 className="text-3xl font-heading font-extrabold tracking-[-0.03em] text-foreground mb-2">{heading}</h1>
            <p className="text-muted-foreground text-sm">{sub}</p>
          </div>

          {authError && (
            <div className="mb-5 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-sm text-red-700 dark:text-red-400">
              Authentication failed. Please try again.
            </div>
          )}

          {success && (
            <div className="mb-5 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 text-sm text-green-700 dark:text-green-300 flex items-start gap-2">
              <div className="w-5 h-5 rounded-md bg-foreground flex items-center justify-center shrink-0 mt-0.5">
                <Mail size={11} strokeWidth={1.5} className="text-background" />
              </div>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-8 space-y-5">
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

            {mode !== "forgot" && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Password
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => { setMode("forgot"); setError(""); setSuccess(""); }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder={mode === "signup" ? "Create a strong password" : "Your password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPwdTouched(true); }}
                    required
                    className="text-base pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword
                      ? <EyeOff size={15} strokeWidth={1.5} />
                      : <Eye size={15} strokeWidth={1.5} />}
                  </button>
                </div>

                {/* Password rules */}
                {showRules && (
                  <div className="mt-2.5 space-y-1.5">
                    {PWD_RULES.map((rule) => {
                      const ok = rule.test(password);
                      return (
                        <div key={rule.id} className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${ok ? "bg-green-500" : "bg-muted"}`}>
                            {ok
                              ? <Check size={9} strokeWidth={3} className="text-white" />
                              : <X size={9} strokeWidth={2.5} className="text-muted-foreground" />}
                          </div>
                          <span className={`text-xs transition-colors ${ok ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                            {rule.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button
              type="submit"
              disabled={loading || !email.trim() || (mode !== "forgot" && !password.trim()) || (mode === "signup" && !passwordValid(password))}
              className="w-full bg-foreground text-background hover:bg-brand hover:text-brand-foreground"
            >
              {cta}
            </Button>

            <div className="border-t border-border pt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              {mode === "signin" ? (
                <>
                  No account?{" "}
                  <button type="button" onClick={() => { setMode("signup"); setError(""); setSuccess(""); setPwdTouched(false); setPassword(""); }} className="text-foreground font-semibold hover:text-brand transition-colors">
                    Create one →
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button type="button" onClick={() => { setMode("signin"); setError(""); setSuccess(""); setPwdTouched(false); }} className="text-foreground font-semibold hover:text-brand transition-colors">
                    Sign in →
                  </button>
                </>
              )}
            </div>
          </form>

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

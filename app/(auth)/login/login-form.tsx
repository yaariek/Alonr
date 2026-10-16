"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Mail, MailCheck, ShieldCheck, Sparkles } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { PageHeading } from "@/components/page-heading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeNext, startSignIn, verifyCode } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

const DEMO_EMAIL = "judge@demo.ac.uk";

type Step = "email" | "code" | "sent";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [tester, setTester] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error") === "link" ? "That sign-in link has expired or was already used. Try again." : null,
  );

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await startSignIn(createClient(), email);
    setBusy(false);
    if (res.step === "error") setError(res.message);
    else {
      setTester(res.tester);
      setStep("code");
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await verifyCode(createClient(), email, code);
    if (!res.ok) {
      setBusy(false);
      setError(res.message);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  function demoLogin() {
    setEmail(DEMO_EMAIL);
    setTester(true);
    setCode("");
    setError(null);
    setStep("code");
  }

  function restart() {
    setStep("email");
    setCode("");
    setError(null);
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="size-6" />
        </div>
        <PageHeading title="Welcome to alonr" tagline="Find your next room, student to student." />
        <CardDescription>
          {step === "email" && "Verified UK student housing swap & release marketplace. Sign in with your .ac.uk email."}
          {step === "code" && <>Enter the code for <strong>{email}</strong>.</>}
          {step === "sent" && "Check your uni inbox."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {step === "email" && (
          <>
            <form onSubmit={submitEmail} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">University email</Label>
                <div className="relative">
                  <Mail className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="student@ucl.ac.uk"
                    className="pl-9"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" className="h-10 w-full font-semibold" disabled={busy}>
                {busy ? "Sending…" : "Continue"}
              </Button>
            </form>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              Hackathon demo access
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full gap-2 border-primary/30 font-semibold text-primary hover:bg-primary/5"
              onClick={demoLogin}
            >
              <Sparkles className="size-4" />
              Judge demo login
            </Button>
          </>
        )}

        {step === "code" && (
          <form onSubmit={submitCode} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="code">Code</Label>
              <div className="relative">
                <KeyRound className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                <Input
                  id="code"
                  autoComplete="one-time-code"
                  inputMode={tester ? "text" : "numeric"}
                  className="pl-9 tracking-widest"
                  autoFocus
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {tester
                  ? "Testers: use the tester code you were given."
                  : "We emailed you a 6-digit code (check spam too). You can also tap the link in that email on this device."}
              </p>
            </div>
            <Button type="submit" className="h-10 w-full font-semibold" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={restart}>
              Use a different email
            </Button>
          </form>
        )}

        {step === "sent" && (
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 rounded-md bg-muted p-3">
              <MailCheck className="mt-0.5 size-5 shrink-0 text-primary" />
              <p>
                We sent a sign-in link to <strong>{email}</strong>. Open it on this device to finish signing in.
              </p>
            </div>
            <Button type="button" variant="ghost" className="w-full" onClick={restart}>
              Use a different email
            </Button>
          </div>
        )}

        <Link href="/map" className={buttonVariants({ variant: "link", className: "w-full" })}>
          Browse the map without signing in
        </Link>
      </CardContent>
    </Card>
  );
}

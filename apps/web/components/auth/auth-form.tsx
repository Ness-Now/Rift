"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { ApiError } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";

type AuthMode = "login" | "signup";

const modeCopy: Record<
  AuthMode,
  {
    title: string;
    submitLabel: string;
    switchHref: string;
    switchLabel: string;
    switchText: string;
  }
> = {
  login: {
    title: "Log in",
    submitLabel: "Log in",
    switchHref: "/signup",
    switchLabel: "Create an account",
    switchText: "Need an account?"
  },
  signup: {
    title: "Create account",
    submitLabel: "Sign up",
    switchHref: "/login",
    switchLabel: "Log in",
    switchText: "Already have an account?"
  }
};

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const auth = useAuth();
  const copy = modeCopy[mode];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        await auth.signup({ email, password });
      } else {
        await auth.login({ email, password });
      }
      router.push("/app");
    } catch (submissionError) {
      if (submissionError instanceof ApiError) {
        setError(submissionError.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-panel backdrop-blur">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">
          MVP auth shell
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">{copy.title}</h1>
        <p className="text-sm leading-6 text-ink/70">
          This is the minimum account layer so future Riot profiles, jobs, and reports can belong to a user.
        </p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-ink/80">Email</span>
          <input
            autoComplete="email"
            className="w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-sm outline-none transition focus:border-accent"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-ink/80">Password</span>
          <input
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-sm outline-none transition focus:border-accent"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            required
            type="password"
            value={password}
          />
        </label>

        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          className="w-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting || auth.isLoading}
          type="submit"
        >
          {isSubmitting ? "Working..." : copy.submitLabel}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink/70">
        {copy.switchText}{" "}
        <Link className="font-semibold text-accent" href={copy.switchHref}>
          {copy.switchLabel}
        </Link>
      </p>
    </div>
  );
}
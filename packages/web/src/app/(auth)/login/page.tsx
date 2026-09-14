"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { loginRequest } from "@/services/auth";
import { useAuth } from "@/providers/AuthProvider";
import { errorMessage, successMessage } from "@/utils/toasts";

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      setSession(data.accessToken);
      successMessage(`Welcome back, ${data.user.username}!`);
      router.push("/");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Invalid email or password.";
      errorMessage(message);
    },
  });

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl sm:p-8">
        <h1 className="font-display text-2xl text-foreground">Log in</h1>
        <p className="mt-1 text-sm text-muted">Welcome back to CineSim.</p>

        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate({ email, password });
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Email</span>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Password</span>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </label>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="mt-2 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          New here?{" "}
          <Link href="/register" className="text-accent hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

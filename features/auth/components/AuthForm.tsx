"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";
type ProfileRole = "traveler" | "owner" | "both" | "admin";
type LoginDestination = "traveler" | "owner";

function getRedirectPath(role: ProfileRole, destination?: LoginDestination) {
  if (role === "admin") return "/admin";
  if (role === "both" && destination === "owner") return "/dashboard";
  if (role === "both") return "/trips";
  if (role === "owner") return "/dashboard";
  return "/trips";
}

export default function AuthForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [signupRole, setSignupRole] = useState<Exclude<ProfileRole, "admin">>("traveler");
  const [loginDestination, setLoginDestination] = useState<LoginDestination>("traveler");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function ensureProfile(userId: string, fallbackRole: Exclude<ProfileRole, "admin">) {
    const { data: existing, error: existingError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing?.role) {
      return existing.role as ProfileRole;
    }

    const { error: insertError } = await supabase.from("profiles").insert({
      id: userId,
      role: fallbackRole,
      full_name: fullName || null,
    });

    if (insertError) {
      throw insertError;
    }

    return fallbackRole;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || null,
            },
          },
        });

        if (error) {
          throw error;
        }

        if (data.user && data.session) {
          const role = await ensureProfile(data.user.id, signupRole);
          router.push(getRedirectPath(role, loginDestination));
          router.refresh();
          return;
        }

        setMessage("Signup complete. Check your email to confirm your account, then log in.");
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("No user returned from login.");
      }

      const role = await ensureProfile(data.user.id, "traveler");
      router.push(getRedirectPath(role, loginDestination));
      router.refresh();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Authentication failed.";
      setMessage(text);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4 rounded border border-zinc-200 p-4" onSubmit={handleSubmit}>
      <div className="flex gap-2">
        <button
          className={`rounded px-3 py-1 text-sm ${mode === "login" ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-900"}`}
          type="button"
          onClick={() => setMode("login")}
        >
          Login
        </button>
        <button
          className={`rounded px-3 py-1 text-sm ${mode === "signup" ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-900"}`}
          type="button"
          onClick={() => setMode("signup")}
        >
          Sign up
        </button>
      </div>

      {mode === "signup" ? (
        <label className="block text-sm">
          Full name
          <input
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </label>
      ) : null}

      <label className="block text-sm">
        Email
        <input
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <label className="block text-sm">
        Password
        <input
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      {mode === "login" ? (
        <label className="block text-sm">
          Open as
          <select
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            value={loginDestination}
            onChange={(e) => setLoginDestination(e.target.value as LoginDestination)}
          >
            <option value="traveler">Traveler View</option>
            <option value="owner">Owner View</option>
          </select>
        </label>
      ) : null}

      {mode === "signup" ? (
        <label className="block text-sm">
          Account type
          <select
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            value={signupRole}
            onChange={(e) => setSignupRole(e.target.value as Exclude<ProfileRole, "admin">)}
          >
            <option value="traveler">Traveler</option>
            <option value="owner">Owner</option>
            <option value="both">Both</option>
          </select>
        </label>
      ) : null}

      <button
        className="w-full rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Please wait..." : mode === "signup" ? "Create account" : "Log in"}
      </button>

      {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
    </form>
  );
}


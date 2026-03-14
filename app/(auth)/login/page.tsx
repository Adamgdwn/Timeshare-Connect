import AuthForm from "@/features/auth/components/AuthForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ blocked?: string; error?: string }>;
}) {
  const params = await searchParams;
  const blocked = (params.blocked || "").trim();
  const error = (params.error || "").trim();

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold">Login / Signup</h1>
      <p className="mt-3 text-sm text-zinc-600">Sign in as traveler or owner. Admin access is role-based in profiles.</p>
      {blocked ? (
        <p className="mt-3 rounded border border-zinc-300 bg-zinc-50 p-2 text-xs text-zinc-700">
          Your account is currently <span className="font-medium">{blocked.replaceAll("_", " ")}</span>. Contact support for review.
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</p>
      ) : null}
      <div className="mt-6">
        <AuthForm />
      </div>
    </main>
  );
}

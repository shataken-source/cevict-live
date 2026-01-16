export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string; error?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = resolvedSearchParams?.next || '/admin';
  const error = resolvedSearchParams?.error;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Admin Login</h1>
        <p className="mt-1 text-sm text-slate-600">Enter the admin password to access PetReunion admin tools.</p>

        {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

        <form className="mt-6 space-y-4" action="/api/admin/login" method="post">
          <input type="hidden" name="next" value={nextPath} />

          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="w-full rounded-md border px-3 py-2"
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="w-full rounded-md bg-slate-900 px-3 py-2 text-white">
            Sign in
          </button>
        </form>

        <div className="mt-4 text-xs text-slate-500">
          Enter the admin password to access PetReunion admin tools.
        </div>
      </div>
    </div>
  );
}

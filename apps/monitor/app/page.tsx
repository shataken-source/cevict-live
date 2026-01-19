export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <main className="max-w-6xl mx-auto p-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-bold">Monitor</h1>
        <p className="mt-2 text-sm text-slate-300">
          Your dashboard will appear here once the admin pages and API routes are wired in.
        </p>
        <div className="mt-4 text-xs text-slate-400">
          If you’re seeing this in production, authentication is working and the app is deploying successfully.
        </div>
      </div>
    </main>
  );
}


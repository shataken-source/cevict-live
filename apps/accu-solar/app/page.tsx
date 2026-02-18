export default async function Home() {
  const now = new Date().toLocaleTimeString();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My Solar System</h1>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-800 p-4">
          <h2 className="text-sm text-slate-400">Now</h2>
          <p className="mt-2 text-xl font-semibold">— kW producing</p>
          <p className="text-sm text-slate-400 mt-1">Last updated {now}</p>
        </div>

        <div className="rounded-lg border border-slate-800 p-4">
          <h2 className="text-sm text-slate-400">Today</h2>
          <p className="mt-2 text-xl font-semibold">— kWh generated</p>
          <p className="text-sm text-slate-400 mt-1">—% of home usage</p>
        </div>

        <div className="rounded-lg border border-slate-800 p-4">
          <h2 className="text-sm text-slate-400">System health</h2>
          <p className="mt-2 text-sm text-slate-300">No issues detected</p>
        </div>
      </section>
    </div>
  );
}

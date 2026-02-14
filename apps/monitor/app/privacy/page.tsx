export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0e17] text-white p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Privacy Policy</h1>
      <p className="text-slate-400 text-sm mb-6">
        Last updated: {new Date().toISOString().slice(0, 10)}
      </p>
      <div className="prose prose-invert prose-sm text-slate-300 space-y-4">
        <p>
          This is a placeholder. Replace with your actual Privacy Policy. Include: what data we collect
          (account, websites monitored, check results, usage), how we use it, how we store it, third parties
          (e.g. Clerk, Stripe, Supabase, Sinch for SMS), cookies, and user rights (access, deletion).
        </p>
        <p>
          We do not sell your data. Monitoring data is used only to provide the service and improve reliability.
        </p>
      </div>
      <a href="/landing" className="inline-block mt-8 text-cyan-400 hover:text-cyan-300 text-sm">
        ← Back to Website Monitor
      </a>
    </div>
  );
}

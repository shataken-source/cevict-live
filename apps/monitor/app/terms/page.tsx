export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0e17] text-white p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Terms of Service</h1>
      <p className="text-slate-400 text-sm mb-6">
        Last updated: {new Date().toISOString().slice(0, 10)}
      </p>
      <div className="prose prose-invert prose-sm text-slate-300 space-y-4">
        <p>
          This is a placeholder. Replace with your actual Terms of Service. Include: acceptance of terms,
          description of the Service (Website Monitor), account responsibility, acceptable use, payment terms
          for paid plans, limitation of liability, termination, and governing law.
        </p>
        <p>
          For now, use of the product implies acceptance of reasonable use for monitoring your own websites
          and compliance with applicable law.
        </p>
      </div>
      <a href="/landing" className="inline-block mt-8 text-cyan-400 hover:text-cyan-300 text-sm">
        ← Back to Website Monitor
      </a>
    </div>
  );
}

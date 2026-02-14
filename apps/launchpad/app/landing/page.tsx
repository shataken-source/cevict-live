import Link from 'next/link';

export const metadata = {
  title: 'Launchpad – Command Center | cevict.ai',
  description: 'Ops dashboard: project grid, health, Command Center. Part of cevict.ai.',
};

export default function LaunchpadLanding() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-white" style={{
      background: 'radial-gradient(circle at top, #0a0e27 0%, #020617 45%, #000000 100%)',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Mono", Menlo, Monaco, Consolas, monospace',
    }}>
      <div className="max-w-2xl text-center">
        <div className="text-6xl mb-6">🚀</div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
          Launchpad
        </h1>
        <p className="text-slate-400 text-lg mb-8">
          Command Center for your projects. Health, start/stop, AI messaging, risk factors. Built for cevict.ai.
        </p>
        <Link
          href="/sign-in"
          className="inline-block px-8 py-4 rounded-xl font-bold text-lg bg-green-600 hover:bg-green-500 text-white no-underline transition"
        >
          Sign in to open dashboard
        </Link>
        <p className="text-slate-500 text-sm mt-8">
          <a href="https://cevict.ai" className="text-blue-400 hover:underline">cevict.ai</a>
        </p>
      </div>
    </div>
  );
}

import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const debugUiEnabled = process.env.ADMIN_DEBUG === 'true' || process.env.NEXT_PUBLIC_ADMIN_DEBUG === 'true';
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center gap-4">
          <h1 className="text-2xl font-bold">PetReunion Admin</h1>
          {debugUiEnabled ? (
            <div className="text-[11px] text-slate-400 select-none">SSR build: main-admin-layout-2026-01-15</div>
          ) : null}
          <div className="flex items-center gap-3">
            <form action="/api/admin/logout" method="post">
              <button type="submit" className="text-sm text-red-600 hover:text-red-700">
                Logout
              </button>
            </form>
            <Link href="/" className="text-gray-600">
              ← Back
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}

import Link from 'next/link'
import AdminAuth from '@/components/admin/AdminAuth'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuth>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">SmokersRights Admin</h1>
            <Link href="/" className="text-gray-600">← Back</Link>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
      </div>
    </AdminAuth>
  )
}

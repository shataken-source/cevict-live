import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AdminHomePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin</h1>
        <p className="text-gray-600 mb-8">Administration tools and dashboards.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AdminCard href="/admin/health" title="System Health" description="Health checks and monitoring" />
          <AdminCard href="/admin/campaigns" title="Campaigns" description="Email campaign tools" />
          <AdminCard href="/admin/users" title="Users" description="User management (placeholder)" />
          <AdminCard href="/admin/points" title="Points" description="Points system (placeholder)" />
          <AdminCard href="/admin/bookings" title="Bookings" description="Bookings management (placeholder)" />
          <AdminCard href="/admin/moderation" title="Moderation" description="Content moderation (placeholder)" />
          <AdminCard href="/admin/analytics" title="Analytics" description="Analytics (placeholder)" />
        </div>
      </div>
    </div>
  );
}

function AdminCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition"
    >
      <div className="font-semibold text-gray-900">{title}</div>
      <div className="mt-1 text-sm text-gray-600">{description}</div>
    </Link>
  );
}

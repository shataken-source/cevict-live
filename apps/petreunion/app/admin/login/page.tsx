import { AdminLoginForm } from './AdminLoginForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string; error?: string }>;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const nextPath = resolved?.next || '/admin';
  const error = resolved?.error;
  return (
    <>
      {/* Server-rendered marker to prove the correct build is being served */}
      <div style={{ display: 'none' }}>UI build: 2026-01-15a</div>
      <AdminLoginForm nextPath={nextPath} error={error} />
    </>
  );
}

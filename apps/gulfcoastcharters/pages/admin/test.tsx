import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

export default function TestPage() {
  const router = useRouter();
  const supabase = createPagesBrowserClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/admin/login');
    });
  }, [router, supabase]);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Test Page Works!</h1>
      <p>If you see this, the admin routes are working.</p>
    </div>
  );
}

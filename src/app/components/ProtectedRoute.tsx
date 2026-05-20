import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { getUserRole } from '../lib/auth';
import { getSupabaseClient } from '../lib/supabase';

type GuardState = 'loading' | 'authorized' | 'unauthorized';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GuardState>('loading');

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        if (!cancelled) setState('unauthorized');
        return;
      }

      const role = await getUserRole();

      if (!cancelled) {
        setState(role === 'admin' ? 'authorized' : 'unauthorized');
      }
    }

    void checkAccess();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'loading') {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: '#FAF7FF' }}
      >
        <p style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E' }}>
          Verifying access…
        </p>
      </div>
    );
  }

  if (state === 'unauthorized') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

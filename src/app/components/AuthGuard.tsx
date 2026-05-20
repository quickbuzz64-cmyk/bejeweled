import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { getSupabaseClient } from '../lib/supabase';

type GuardState = 'loading' | 'authenticated' | 'unauthenticated';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GuardState>('loading');
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();

      if (!cancelled) {
        setState(data.session ? 'authenticated' : 'unauthenticated');
      }
    }

    void check();

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
          Loading…
        </p>
      </div>
    );
  }

  if (state === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

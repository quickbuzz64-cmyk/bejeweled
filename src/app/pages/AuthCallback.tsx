import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { BrandLogo } from '../components/BrandLogo';
import { PageSeo } from '../components/PageSeo';
import { getUserRole } from '../lib/auth';
import { getSupabaseClient } from '../lib/supabase';

type CallbackState = {
  status: 'loading' | 'error';
  message: string;
};

export default function AuthCallback() {
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>({
    status: 'loading',
    message: 'Confirming your email and signing you in…',
  });

  useEffect(() => {
    let cancelled = false;

    async function completeConfirmation() {
      try {
        const supabase = getSupabaseClient();
        const currentUrl = new URL(window.location.href);
        const authCode = currentUrl.searchParams.get('code');
        const errorDescription = currentUrl.searchParams.get('error_description');

        if (errorDescription) {
          throw new Error(errorDescription);
        }

        if (authCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(authCode);

          if (error) {
            throw error;
          }
        }

        const { data } = await supabase.auth.getSession();

        if (!data.session) {
          throw new Error('Confirmation completed, but no active session was found. Please sign in manually.');
        }

        const role = await getUserRole();

        if (!cancelled) {
          navigate(role === 'admin' ? '/admin' : '/dashboard', { replace: true });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unable to confirm your email right now.',
          });
        }
      }
    }

    void completeConfirmation();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-10"
      style={{ backgroundColor: '#FAF7FF' }}
    >
      <PageSeo title="Confirming Email" />
      <section
        className="w-full max-w-lg rounded-3xl border p-10 text-center"
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: '#E5E7EB',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
        }}
      >
        <BrandLogo className="mb-6 inline-block" imageClassName="h-20 w-auto" />
        <h1
          className="mb-4 text-3xl"
          style={{ fontFamily: 'Playfair Display, serif', color: '#1A0A24', fontWeight: 600 }}
        >
          {state.status === 'loading' ? 'Confirming your email' : 'Confirmation issue'}
        </h1>
        <p
          style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E', lineHeight: 1.8 }}
        >
          {state.message}
        </p>
      </section>
    </main>
  );
}
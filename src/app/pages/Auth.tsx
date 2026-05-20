import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Eye, EyeOff } from 'lucide-react';
import { showErrorToast, showInfoToast, showSuccessToast } from '../lib/notifications';
import { signIn, signUp, useAuthSession } from '../lib/auth';
import { PageSeo } from '../components/PageSeo';

type AuthMode = 'login' | 'register';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: '#FFFFFF',
  border: '1px solid #D9C9E8',
  borderRadius: '3px',
  color: '#1A0A24',
  fontFamily: 'Inter, sans-serif',
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#6B4F7A',
  fontWeight: 600,
  fontFamily: 'Inter, sans-serif',
  marginBottom: '6px',
};

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const authSession = useAuthSession();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/';

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
  });

  useEffect(() => {
    setMode(location.pathname === '/register' ? 'register' : 'login');
  }, [location.pathname]);

  const pageTitle = mode === 'register' ? 'Create Account' : 'Sign In';

  useEffect(() => {
    if (authSession?.isAuthenticated) navigate(redirectTo);
  }, [authSession?.isAuthenticated, navigate, redirectTo]);

  const getAuthErrorMessage = (error: Error): string => {
    const msg = error.message.toLowerCase();
    if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
      return 'Incorrect email or password. Please check your details and try again.';
    }
    if (msg.includes('email not confirmed')) {
      return 'Please confirm your email address before signing in. Check your inbox.';
    }
    if (msg.includes('user already registered') || msg.includes('already registered')) {
      return 'An account with this email already exists. Please sign in instead.';
    }
    if (msg.includes('password')) {
      return 'Password must be at least 8 characters long.';
    }
    if (msg.includes('rate limit') || msg.includes('too many')) {
      return 'Too many attempts. Please wait a moment before trying again.';
    }
    return error.message;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await signIn(loginForm.email, loginForm.password);
      showSuccessToast('Welcome back.', 'You are now signed in.');
      navigate(redirectTo);
    } catch (error) {
      showErrorToast('Sign in failed.', error instanceof Error ? getAuthErrorMessage(error) : 'Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerForm.password !== registerForm.confirmPassword) {
      showErrorToast('Passwords do not match.', 'Please re-enter matching passwords.');
      return;
    }
    if (registerForm.password.length < 8) {
      showErrorToast('Password too short.', 'Password must be at least 8 characters.');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await signUp(registerForm.email, registerForm.password, {
        firstName: registerForm.firstName,
        lastName: registerForm.lastName,
      });
      if (result.requiresConfirmation) {
        // Email confirmation is enabled — user must verify before they can sign in
        showInfoToast('Confirm your email.', 'A confirmation link has been sent to your inbox. Please verify your email to continue.');
        navigate('/login');
      } else {
        // Immediately authenticated — session created by Supabase
        showSuccessToast('Account created.', `Welcome to Bejeweled, ${registerForm.firstName}.`);
        navigate(redirectTo);
      }
    } catch (error) {
      showErrorToast('Registration failed.', error instanceof Error ? getAuthErrorMessage(error) : 'Unable to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Inter, sans-serif' }}>
      <PageSeo title={pageTitle} />

      {/* ── Left brand panel ─────────────────────────────────────── */}
      <div
        className="hidden lg:flex"
        style={{ width: '42%', background: '#1A0A24', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '80px 64px', position: 'relative', flexShrink: 0 }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#C9A84C' }} />

        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#C9A84C', fontWeight: 600, marginBottom: '24px', marginTop: 0 }}>
            EST. LAHORE, PAKISTAN
          </p>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '3.25rem', fontWeight: 600, color: '#FAF7FF', margin: '0 0 6px', letterSpacing: '0.12em', textTransform: 'uppercase', lineHeight: 1.1 }}>
            BEJEWELED
          </h1>
          <div style={{ width: '48px', height: '1px', background: '#C9A84C', margin: '20px auto 24px' }} />
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', lineHeight: 1.8, margin: 0, maxWidth: 260 }}>
            Curated luxury jewelry — crafted to be cherished, chosen for every occasion.
          </p>
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: '#C9A84C' }} />
      </div>

      {/* ── Right form panel ─────────────────────────────────────── */}
      <main
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 32px', backgroundColor: '#FAF7FF', overflowY: 'auto' }}
      >
        <div style={{ width: '100%', maxWidth: '400px' }}>

          {/* Mobile brand */}
          <div className="lg:hidden" style={{ textAlign: 'center', marginBottom: '40px' }}>
            <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', fontWeight: 600, color: '#1A0A24', margin: '0 0 4px', letterSpacing: '0.1em' }}>BEJEWELED</p>
            <p style={{ fontSize: '0.75rem', letterSpacing: '0.1em', color: '#9B8FAA', margin: 0 }}>Lahore, Pakistan</p>
          </div>

          {/* Back link */}
          <div style={{ marginBottom: '36px' }}>
            <Link to="/" style={{ fontFamily: 'Inter, sans-serif', color: '#9B8FAA', fontSize: '0.8rem', textDecoration: 'none', letterSpacing: '0.04em' }}>
              ← Back to store
            </Link>
          </div>

          {mode === 'login' ? (
            <section aria-labelledby="login-heading">
              <header style={{ marginBottom: '32px' }}>
                <h2 id="login-heading" style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.875rem', fontWeight: 600, color: '#1A0A24', margin: '0 0 8px', lineHeight: 1.2 }}>
                  Welcome Back
                </h2>
                <p style={{ color: '#6B4F7A', fontSize: '0.875rem', margin: 0, lineHeight: 1.6 }}>
                  Sign in to your Bejeweled account
                </p>
              </header>

              <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label htmlFor="login-email" style={labelStyle}>Email Address</label>
                  <input
                    type="email" id="login-email" value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    required autoComplete="email" style={inputStyle} placeholder="your@email.com"
                    onFocus={(e) => { e.target.style.borderColor = '#5B1E6E'; e.target.style.boxShadow = '0 0 0 3px rgba(91,30,110,0.08)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#D9C9E8'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>

                <div>
                  <label htmlFor="login-password" style={labelStyle}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'} id="login-password" value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required autoComplete="current-password" style={{ ...inputStyle, paddingRight: '44px' }} placeholder="••••••••"
                      onFocus={(e) => { e.target.style.borderColor = '#5B1E6E'; e.target.style.boxShadow = '0 0 0 3px rgba(91,30,110,0.08)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#D9C9E8'; e.target.style.boxShadow = 'none'; }}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9B8FAA', padding: '2px', display: 'flex', alignItems: 'center' }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label htmlFor="remember-me" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" id="remember-me" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                      style={{ width: '15px', height: '15px', accentColor: '#5B1E6E', cursor: 'pointer' }} />
                    <span style={{ fontSize: '0.8rem', color: '#6B4F7A', fontFamily: 'Inter, sans-serif' }}>Remember me</span>
                  </label>
                  <button type="button" onClick={() => showInfoToast('Password reset', 'Please contact support to reset your password.')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#5B1E6E', fontFamily: 'Inter, sans-serif', padding: 0 }}>
                    Forgot password?
                  </button>
                </div>

                <button type="submit" disabled={isSubmitting}
                  style={{ width: '100%', padding: '13px', background: isSubmitting ? '#9B8FAA' : '#5B1E6E', color: '#FFFFFF', border: 'none', borderRadius: '3px', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: isSubmitting ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif', marginTop: '4px', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.background = '#3B0D4A'; }}
                  onMouseLeave={(e) => { if (!isSubmitting) e.currentTarget.style.background = '#5B1E6E'; }}>
                  {isSubmitting ? 'Signing in…' : 'Sign In'}
                </button>

                <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#6B4F7A', margin: 0, fontFamily: 'Inter, sans-serif' }}>
                  New to Bejeweled?{' '}
                  <button type="button" onClick={() => navigate('/register')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3B0D4A', fontWeight: 600, fontSize: '0.8125rem', fontFamily: 'Inter, sans-serif', padding: 0 }}>
                    Create an account
                  </button>
                </p>
              </form>
            </section>
          ) : (
            <section aria-labelledby="register-heading">
              <header style={{ marginBottom: '32px' }}>
                <h2 id="register-heading" style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.875rem', fontWeight: 600, color: '#1A0A24', margin: '0 0 8px', lineHeight: 1.2 }}>
                  Create Account
                </h2>
                <p style={{ color: '#6B4F7A', fontSize: '0.875rem', margin: 0, lineHeight: 1.6 }}>
                  Join Bejeweled and start your collection
                </p>
              </header>

              <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label htmlFor="register-firstName" style={labelStyle}>First Name</label>
                    <input type="text" id="register-firstName" value={registerForm.firstName}
                      onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                      required autoComplete="given-name" style={inputStyle}
                      onFocus={(e) => { e.target.style.borderColor = '#5B1E6E'; e.target.style.boxShadow = '0 0 0 3px rgba(91,30,110,0.08)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#D9C9E8'; e.target.style.boxShadow = 'none'; }} />
                  </div>
                  <div>
                    <label htmlFor="register-lastName" style={labelStyle}>Last Name</label>
                    <input type="text" id="register-lastName" value={registerForm.lastName}
                      onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                      required autoComplete="family-name" style={inputStyle}
                      onFocus={(e) => { e.target.style.borderColor = '#5B1E6E'; e.target.style.boxShadow = '0 0 0 3px rgba(91,30,110,0.08)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#D9C9E8'; e.target.style.boxShadow = 'none'; }} />
                  </div>
                </div>

                <div>
                  <label htmlFor="register-email" style={labelStyle}>Email Address</label>
                  <input type="email" id="register-email" value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    required autoComplete="email" style={inputStyle} placeholder="your@email.com"
                    onFocus={(e) => { e.target.style.borderColor = '#5B1E6E'; e.target.style.boxShadow = '0 0 0 3px rgba(91,30,110,0.08)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#D9C9E8'; e.target.style.boxShadow = 'none'; }} />
                </div>

                <div>
                  <label htmlFor="register-password" style={labelStyle}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPassword ? 'text' : 'password'} id="register-password" value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      required autoComplete="new-password" style={{ ...inputStyle, paddingRight: '44px' }}
                      placeholder="Min. 8 characters" minLength={8}
                      onFocus={(e) => { e.target.style.borderColor = '#5B1E6E'; e.target.style.boxShadow = '0 0 0 3px rgba(91,30,110,0.08)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#D9C9E8'; e.target.style.boxShadow = 'none'; }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9B8FAA', padding: '2px', display: 'flex', alignItems: 'center' }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="register-confirmPassword" style={labelStyle}>Confirm Password</label>
                  <input type={showPassword ? 'text' : 'password'} id="register-confirmPassword"
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                    required autoComplete="new-password" style={inputStyle} placeholder="••••••••"
                    onFocus={(e) => { e.target.style.borderColor = '#5B1E6E'; e.target.style.boxShadow = '0 0 0 3px rgba(91,30,110,0.08)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#D9C9E8'; e.target.style.boxShadow = 'none'; }} />
                </div>

                <button type="submit" disabled={isSubmitting}
                  style={{ width: '100%', padding: '13px', background: isSubmitting ? '#9B8FAA' : '#5B1E6E', color: '#FFFFFF', border: 'none', borderRadius: '3px', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: isSubmitting ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif', marginTop: '4px', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.background = '#3B0D4A'; }}
                  onMouseLeave={(e) => { if (!isSubmitting) e.currentTarget.style.background = '#5B1E6E'; }}>
                  {isSubmitting ? 'Creating account…' : 'Create Account'}
                </button>

                <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#6B4F7A', margin: 0, fontFamily: 'Inter, sans-serif' }}>
                  Already have an account?{' '}
                  <button type="button" onClick={() => navigate('/login')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3B0D4A', fontWeight: 600, fontSize: '0.8125rem', fontFamily: 'Inter, sans-serif', padding: 0 }}>
                    Sign in
                  </button>
                </p>
              </form>
            </section>
          )}

          <footer style={{ marginTop: '40px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: '#9B8FAA', fontFamily: 'Inter, sans-serif', lineHeight: 1.6, margin: 0 }}>
              By continuing, you agree to Bejeweled's{' '}
              <Link to="/terms" style={{ color: '#5B1E6E', textDecoration: 'underline' }}>Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" style={{ color: '#5B1E6E', textDecoration: 'underline' }}>Privacy Policy</Link>.
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}

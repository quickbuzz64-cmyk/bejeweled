import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Lock, Mail } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { showErrorToast, showInfoToast, showSuccessToast } from '../lib/notifications';
import { signIn } from '../lib/auth';
import { PageSeo } from '../components/PageSeo';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!email || !password) {
      showErrorToast('Email and password are required.', 'Enter both admin credentials to continue.');
      return;
    }

    setIsSubmitting(true);

    try {
      await signIn(email, password);
      showSuccessToast('Admin login successful.', 'Welcome back to the Bejeweled dashboard.');
      navigate('/admin');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in right now.';
      showErrorToast('Invalid credentials.', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageSeo title="Admin Login" />
      <main 
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: '#FAF7FF' }}
      >
      {/* Login Card */}
      <article 
        className="w-full max-w-md p-10 rounded-3xl"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* Admin Logo & Header */}
        <header className="text-center mb-8">
          <BrandLogo className="mb-4 inline-block" imageClassName="h-20 w-auto" />
          <p 
            className="text-sm mb-1"
            style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E', fontWeight: 600 }}
          >
            Admin Dashboard
          </p>
          <p 
            className="text-xs"
            style={{ fontFamily: 'Inter, sans-serif', color: '#9CA3AF' }}
          >
            Sign in to manage your store
          </p>
        </header>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          {/* Email Field */}
          <div className="mb-5">
            <label 
              htmlFor="adminEmail"
              className="block text-sm mb-2"
              style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600 }}
            >
              Admin Email
            </label>
            <div className="relative">
              <Mail 
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                style={{ color: '#9CA3AF' }}
                aria-hidden="true"
              />
              <input
                type="email"
                id="adminEmail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@bejeweled.store"
                className="w-full pl-12 pr-4 py-3 rounded-xl transition-all"
                style={{
                  border: '2px solid #E5E7EB',
                  fontFamily: 'Inter, sans-serif',
                  color: '#1A0A24',
                  outline: 'none',
                }}
                onFocus={(e) => e.target.style.borderColor = '#5B1E6E'}
                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="mb-5">
            <label 
              htmlFor="adminPassword"
              className="block text-sm mb-2"
              style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600 }}
            >
              Password
            </label>
            <div className="relative">
              <Lock 
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                style={{ color: '#9CA3AF' }}
                aria-hidden="true"
              />
              <input
                type="password"
                id="adminPassword"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-12 pr-4 py-3 rounded-xl transition-all"
                style={{
                  border: '2px solid #E5E7EB',
                  fontFamily: 'Inter, sans-serif',
                  color: '#1A0A24',
                  outline: 'none',
                }}
                onFocus={(e) => e.target.style.borderColor = '#5B1E6E'}
                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="mb-6 flex items-center justify-between">
            <label 
              htmlFor="rememberMe"
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded cursor-pointer"
                style={{
                  accentColor: '#5B1E6E',
                }}
              />
              <span 
                className="text-sm"
                style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E', fontWeight: 500 }}
              >
                Remember me
              </span>
            </label>
            
            <button
              type="button"
              className="text-sm transition-all hover:opacity-70"
              style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E', fontWeight: 500 }}
              onClick={() => showInfoToast('Password reset is not configured yet.', 'Please contact the site administrator to reset your password.')}
              aria-label="Open admin password reset information"
            >
              Forgot password?
            </button>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="w-full py-4 rounded-xl transition-all hover:scale-[1.02]"
            style={{
              backgroundColor: '#5B1E6E',
              color: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(91, 30, 110, 0.3)',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: '1rem',
            }}
          >
            Login to Dashboard
          </button>
        </form>

        {/* Back to Store Link */}
        <footer className="mt-6 text-center">
          <Link
            to="/"
            className="text-sm transition-all hover:opacity-70"
            style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E', fontWeight: 500 }}
          >
            ← Back to Store
          </Link>
        </footer>
      </article>
      </main>
    </>
  );
}

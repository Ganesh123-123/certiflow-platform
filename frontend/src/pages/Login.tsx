import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  Eye,
  EyeOff,
  FileCheck2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth, DEMO_USERS } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  if (user) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setLoginError('');
    try {
      await login(data.email, data.password, rememberMe);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err: any) {
      const message = err.response?.data?.message ?? 'Login failed. Check your credentials.';
      setLoginError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (email: string) => {
    setValue('email', email.replace('@certiflow.gov.in', '@certiflow.demo'));
    setValue('password', 'Demo@1234');
  };

  return (
    <main className="login-shell">
      <aside className="login-showcase">
        <div className="login-showcase-orb login-showcase-orb-one" />
        <div className="login-showcase-orb login-showcase-orb-two" />
        <div className="login-showcase-content">
          <header className="login-brand" aria-label="CertiFlow">
            <div className="login-emblem">
              <Award aria-hidden="true" />
            </div>
            <div>
              <h1>CertiFlow</h1>
              <p>Pragati Skills Mission</p>
            </div>
          </header>

          <div className="login-hero-copy">
            <div className="login-eyebrow"><Sparkles /> Trusted digital credentials</div>
            <h2>Empowering Skills.<br />Certifying Futures.</h2>
            <p>
              A secure, transparent platform for issuing and verifying the achievements
              that move people and communities forward.
            </p>
          </div>

          <div className="certificate-scene" aria-label="Digital certificate illustration">
            <div className="certificate-glow" />
            <div className="certificate-orbit certificate-orbit-one" />
            <div className="certificate-orbit certificate-orbit-two" />
            <div className="certificate-card">
              <div className="certificate-card-top">
                <span className="certificate-mini-brand"><Award /> CERTIFLOW</span>
                <span className="certificate-verified"><BadgeCheck /> Verified</span>
              </div>
              <div className="certificate-rule" />
              <div className="certificate-copy">
                <span>Certificate of achievement</span>
                <strong>Skills successfully<br />certified</strong>
                <i />
                <small>Pragati Skills Mission</small>
              </div>
              <div className="certificate-seal"><Award /></div>
              <div className="certificate-card-footer">
                <span>SECURE DIGITAL CREDENTIAL</span>
                <FileCheck2 />
              </div>
            </div>
            <div className="certificate-float certificate-float-check"><ShieldCheck /></div>
            <div className="certificate-float certificate-float-sparkle"><Sparkles /></div>
          </div>

          <ul className="login-features">
            <li><span><ShieldCheck /></span><div><strong>Secure Certification</strong><small>Protected, tamper-evident credentials</small></div></li>
            <li><span><BadgeCheck /></span><div><strong>Transparent Approvals</strong><small>Every step tracked and accountable</small></div></li>
            <li><span><FileCheck2 /></span><div><strong>Instant Verification</strong><small>Trusted credentials, verified in seconds</small></div></li>
          </ul>

          <footer className="login-showcase-footer">
            <span>© 2024 Pragati Skills Mission</span>
            <span>Government of India</span>
          </footer>
        </div>
      </aside>

      <section className="login-panel" aria-labelledby="login-heading">
        <div className="login-panel-inner">
          <div className="login-panel-heading">
            <div className="login-mobile-emblem"><Award /></div>
            <span className="login-panel-overline">CERTIFICATE ISSUANCE PLATFORM</span>
            <h2 id="login-heading">Welcome back</h2>
            <p>Sign in with your official account to continue.</p>
          </div>

          {loginError && (
            <div className="login-error" role="alert">
              {loginError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="login-form">
            <div className="login-field">
              <label htmlFor="official-email">Official email</label>
              <div className="login-input-wrap">
                <Mail className="login-input-icon" aria-hidden="true" />
                <input
                  id="official-email"
                  {...register('email')}
                  type="email"
                  placeholder="name@certiflow.gov.in"
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
              </div>
              {errors.email && <p id="email-error" className="login-field-error">{errors.email.message}</p>}
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>
              <div className="login-input-wrap">
                <LockKeyhole className="login-input-icon" aria-hidden="true" />
                <input
                  id="password"
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="login-password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
              {errors.password && <p id="password-error" className="login-field-error">{errors.password.message}</p>}
            </div>

            <div className="login-options">
              <label className="login-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                className="login-forgot"
                onClick={() => toast('Please contact your CertiFlow administrator to reset your password.')}
              >
                Forgot password?
              </button>
            </div>

            <button type="submit" disabled={loading} className="login-submit">
              {loading ? (
                <span className="login-spinner" aria-hidden="true" />
              ) : (
                <span>Sign in</span>
              )}
              {loading ? <span>Signing in...</span> : <ArrowRight aria-hidden="true" />}
            </button>
          </form>

          {import.meta.env.DEV && (
            <section className="login-demo" aria-labelledby="demo-heading">
              <div className="login-demo-heading">
                <span className="login-demo-icon"><Sparkles /></span>
                <div>
                  <h3 id="demo-heading">Demo access</h3>
                  <p>Explore CertiFlow with a demo account</p>
                </div>
              </div>
              <label htmlFor="demo-account" className="login-demo-label">Choose an account</label>
              <select
                id="demo-account"
                value=""
                onChange={(event) => {
                  if (event.target.value) fillDemo(event.target.value);
                }}
                aria-label="Select demo account"
              >
                <option value="">Select a demo account</option>
                {DEMO_USERS.map((u) => (
                  <option key={u.email} value={u.email}>
                    {u.name} — {u.email.replace('@certiflow.gov.in', '@certiflow.demo')}
                  </option>
                ))}
              </select>
              <p className="login-demo-password">
                Demo password <code>Demo@1234</code>
              </p>
            </section>
          )}

          <footer className="login-panel-footer">
            <ShieldCheck aria-hidden="true" />
            <span>Secure access to your certification workspace</span>
          </footer>
        </div>
      </section>
    </main>
  );
}

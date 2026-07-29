import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HeartPulse, Eye, EyeOff, ArrowLeft, Mail, Lock, User,
  Building, Stethoscope, ChevronRight, ShieldCheck, Sparkles, Activity
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { loginUser, registerUser, forgotPassword, verifyOtp, resetPassword } from '../api/api';

type Screen = 'auth' | 'forgot' | 'otp' | 'reset';
type AuthTab = 'login' | 'register';

export default function Auth() {
  const navigate = useNavigate();
  const { login, showToast, token } = useApp();
  const [screen, setScreen] = useState<Screen>('auth');
  const [tab, setTab] = useState<AuthTab>('login');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (token) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [token, navigate]);

  // Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [institution, setInstitution] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');

  // Forgot + OTP + Reset
  const [fpEmail, setFpEmail] = useState('');
  const [otpVal, setOtpVal] = useState('');
  const [newPass, setNewPass] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await loginUser(email, password);
      login(data.token, data.userProfile);
      navigate('/app/dashboard');
    } catch (err: any) {
      showToast(err.message || 'Login failed.', 'error');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await registerUser({ name, email: regEmail, password: regPass, specialty, institution });
      login(data.token, data.userProfile);
      navigate('/app/dashboard');
    } catch (err: any) {
      showToast(err.message || 'Registration failed.', 'error');
    } finally { setLoading(false); }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(fpEmail);
      showToast('OTP sent to your email.', 'success');
      setScreen('otp');
    } catch (err: any) {
      showToast(err.message || 'Failed to send OTP.', 'error');
    } finally { setLoading(false); }
  };

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyOtp(fpEmail, otpVal);
      showToast('OTP verified.', 'success');
      setScreen('reset');
    } catch (err: any) {
      showToast(err.message || 'OTP verification failed.', 'error');
    } finally { setLoading(false); }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(fpEmail, otpVal, newPass);
      showToast('Password reset successfully. Please log in.', 'success');
      setScreen('auth');
      setTab('login');
    } catch (err: any) {
      showToast(err.message || 'Reset failed.', 'error');
    } finally { setLoading(false); }
  };

  // High-tech fallback image URL from Unsplash + local image
  const bgImg = '/oncology_hero.png';

  return (
    <div className="auth-split-shell">
      {/* Left side banner */}
      <div
        className="auth-banner-side"
        style={{ backgroundImage: `url(${bgImg}), url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=1600&auto=format&fit=crop')` }}
      >
        <div className="auth-banner-overlay" />
        <div className="auth-banner-content">
          <div>
            <div className="auth-banner-badge">
              <Sparkles size={12} /> Clinical Intelligence Platform
            </div>
            <h1 className="auth-banner-title">
              Precision Staging &amp; AI Decisions for Head &amp; Neck Surgeons
            </h1>
            <p className="auth-banner-sub">
              OcnoDetect analyzes imaging and pathology reports, generates TNM staging, and provides case-anchored AI consultation in under 15 seconds.
            </p>

            <div className="auth-banner-features">
              <div className="auth-banner-feat-item">
                <div className="auth-banner-feat-icon"><Sparkles size={16} /></div>
                <span>AJCC 8th Edition Automated TNM Staging</span>
              </div>
              <div className="auth-banner-feat-item">
                <div className="auth-banner-feat-icon"><Activity size={16} /></div>
                <span>Case-Anchored Multimodal AI Consultation</span>
              </div>
              <div className="auth-banner-feat-item">
                <div className="auth-banner-feat-icon"><ShieldCheck size={16} /></div>
                <span>Automated NCCN &amp; PubMed Protocol Retrieval</span>
              </div>
            </div>
          </div>

          <div className="auth-banner-quote">
            <p className="auth-banner-quote-text">
              "OcnoDetect has fundamentally changed how I prepare for MDT meetings. The AI staging is accurate enough that I use it as a primary cross-check before presenting."
            </p>
            <div className="auth-banner-quote-author">Dr. R. Krishnamurthy</div>
            <div className="auth-banner-quote-role">Head &amp; Neck Surgical Oncologist, AIIMS</div>
          </div>
        </div>
      </div>

      {/* Right side form */}
      <div className="auth-form-side">
        <div className="auth-form-container">
          <div className="auth-logo">
            <HeartPulse size={24} color="var(--primary)" />
            <span className="auth-logo-text">Ocno<span>Detect</span></span>
          </div>

          {screen === 'auth' && (
            <>
              <div style={{ marginBottom: 12 }}>
                <h2 className="auth-title">
                  {tab === 'login' ? 'Welcome back, Doctor' : 'Create Clinician Account'}
                </h2>
                <p style={{ fontSize: 13.5, color: 'var(--fg-secondary)' }}>
                  {tab === 'login'
                    ? 'Enter your credentials to access your clinical dashboard'
                    : 'Register your surgical profile to start staging cases'
                  }
                </p>
              </div>

              <div className="auth-pill-toggle">
                <button
                  type="button"
                  className={`auth-pill-btn ${tab === 'login' ? 'active' : ''}`}
                  onClick={() => setTab('login')}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`auth-pill-btn ${tab === 'register' ? 'active' : ''}`}
                  onClick={() => setTab('register')}
                >
                  Create Account
                </button>
              </div>

              {tab === 'login' ? (
                <form className="auth-form" onSubmit={handleLogin}>
                  <div className="form-group">
                    <label className="input-label"><Mail size={11} style={{ display: 'inline', marginRight: 4 }} />Email</label>
                    <input className="input" type="email" placeholder="dr.name@hospital.com" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="input-label"><Lock size={11} style={{ display: 'inline', marginRight: 4 }} />Password</label>
                    <div style={{ position: 'relative' }}>
                      <input className="input" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={{ paddingRight: 42 }} />
                      <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} type="submit" disabled={loading}>
                    {loading ? <span className="spinner" /> : <><span>Sign In</span><ChevronRight size={15} /></>}
                  </button>
                  <div className="auth-link" onClick={() => setScreen('forgot')}>Forgot password?</div>
                  <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: 'var(--fg-muted)' }}>
                    Don't have an account?{' '}
                    <span className="auth-link-inline" onClick={() => setTab('register')}>
                      Create account
                    </span>
                  </div>
                </form>
              ) : (
                <form className="auth-form" onSubmit={handleRegister}>
                  <div className="form-group">
                    <label className="input-label"><User size={11} style={{ display: 'inline', marginRight: 4 }} />Full Name</label>
                    <input className="input" placeholder="Dr. First Last" value={name} onChange={e => setName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="input-label"><Mail size={11} style={{ display: 'inline', marginRight: 4 }} />Clinical Email</label>
                    <input className="input" type="email" placeholder="dr.name@hospital.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="input-label"><Stethoscope size={11} style={{ display: 'inline', marginRight: 4 }} />Specialty</label>
                      <input className="input" placeholder="Head & Neck Oncology" value={specialty} onChange={e => setSpecialty(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="input-label"><Building size={11} style={{ display: 'inline', marginRight: 4 }} />Institution</label>
                      <input className="input" placeholder="Hospital / University" value={institution} onChange={e => setInstitution(e.target.value)} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="input-label"><Lock size={11} style={{ display: 'inline', marginRight: 4 }} />Password</label>
                    <div style={{ position: 'relative' }}>
                      <input className="input" type={showPass ? 'text' : 'password'} placeholder="Min. 6 characters" value={regPass} onChange={e => setRegPass(e.target.value)} required minLength={6} style={{ paddingRight: 42 }} />
                      <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} type="submit" disabled={loading}>
                    {loading ? <span className="spinner" /> : <><span>Create Account</span><ChevronRight size={15} /></>}
                  </button>
                  <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: 'var(--fg-muted)' }}>
                    Already registered?{' '}
                    <span className="auth-link-inline" onClick={() => setTab('login')}>
                      Sign in
                    </span>
                  </div>
                </form>
              )}
            </>
          )}

          {screen === 'forgot' && (
            <form className="auth-form" onSubmit={handleForgot}>
              <button type="button" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg-secondary)', fontSize: 13, border: 'none', background: 'none', cursor: 'pointer', marginBottom: 12 }} onClick={() => setScreen('auth')}>
                <ArrowLeft size={14} /> Back to sign in
              </button>
              <h2 className="auth-title">Reset Password</h2>
              <p className="auth-sub">Enter your clinical email to receive a 6-digit one-time verification code.</p>
              <div className="form-group">
                <label className="input-label">Clinical Email</label>
                <input className="input" type="email" placeholder="dr.name@hospital.com" value={fpEmail} onChange={e => setFpEmail(e.target.value)} required />
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} type="submit" disabled={loading}>
                {loading ? <span className="spinner" /> : 'Send OTP'}
              </button>
            </form>
          )}

          {screen === 'otp' && (
            <form className="auth-form" onSubmit={handleOtp}>
              <h2 className="auth-title">Enter OTP Code</h2>
              <p className="auth-sub">A 6-digit verification code was sent to <strong>{fpEmail}</strong>.</p>
              <div className="form-group">
                <label className="input-label">One-Time Password</label>
                <input className="input" placeholder="Enter 6-digit OTP" maxLength={6} value={otpVal} onChange={e => setOtpVal(e.target.value.replace(/\D/g, ''))} required style={{ fontSize: 22, fontWeight: 700, letterSpacing: 8, textAlign: 'center' }} />
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} type="submit" disabled={loading}>
                {loading ? <span className="spinner" /> : 'Verify OTP'}
              </button>
              <div className="auth-link" onClick={() => setScreen('forgot')}>Resend code</div>
            </form>
          )}

          {screen === 'reset' && (
            <form className="auth-form" onSubmit={handleReset}>
              <h2 className="auth-title">Set New Password</h2>
              <p className="auth-sub">Choose a new password for your clinician account.</p>
              <div className="form-group">
                <label className="input-label">New Password</label>
                <input className="input" type="password" placeholder="Min. 6 characters" minLength={6} value={newPass} onChange={e => setNewPass(e.target.value)} required />
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} type="submit" disabled={loading}>
                {loading ? <span className="spinner" /> : 'Reset Password'}
              </button>
            </form>
          )}

          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
              <ArrowLeft size={12} /> Back to homepage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

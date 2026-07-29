import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  HeartPulse, Scan, MessageSquare, BookOpen, ArrowRight,
  Microscope, Brain, ShieldCheck, Activity,
  Star, ScanLine, Bot, FileText, X
} from 'lucide-react';
import Ferrofluid from '../components/Ferrofluid';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { useApp } from '../store/AppContext';

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: Scan,
    title: 'AI Scan Analysis',
    desc: 'Upload CT scans or pathology PDFs. Our Gemini + Llama multimodal AI generates comprehensive TNM staging, findings, and surgical considerations in seconds.',
  },
  {
    icon: Brain,
    title: 'Case-Anchored AI Chat',
    desc: 'Ask clinical questions grounded to your patient\'s exact case context. Get evidence-backed answers on surgical approaches, chemoradiation, and reconstruction options.',
  },
  {
    icon: BookOpen,
    title: 'Clinical References',
    desc: 'Auto-surfaced NCCN sub-protocols and curated PubMed research papers tailored to your patient\'s exact staging, site, and procedure.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure & Multi-Tenant',
    desc: 'Each clinician\'s data is fully isolated. JWT authentication, rate limiting, and encrypted storage ensure HIPAA-compliant data handling.',
  },
  {
    icon: Microscope,
    title: 'Pathology Deep-Dive',
    desc: 'Detailed extraction of tumor dimensions, margin clearance, ENE status, perineural invasion, and lymphovascular findings from unstructured reports.',
  },
  {
    icon: Activity,
    title: 'Dashboard Analytics',
    desc: 'Track case distribution, staging trends, and patient volumes. Visual charts reveal patterns in your caseload at a glance.',
  },
];

const steps = [
  { num: '01', title: 'Upload a Scan or Report', desc: 'Drag and drop a CT scan image or pathology PDF. The system accepts DICOM previews, JPEG/PNG scans, and multi-page PDF reports.' },
  { num: '02', title: 'AI Generates Clinical Summary', desc: 'Gemini and Llama models extract TNM staging, surgical considerations, prognostic factors, and MDT recommendations structured as a clinical summary.' },
  { num: '03', title: 'Query, Reference & Act', desc: 'Chat with the AI using your case as context. Pull NCCN protocols and PubMed papers. Save cases to your registry for MDT review.' },
];

const statsData = [
  { target: 99.2, suffix: '%', label: 'Staging Accuracy' },
  { target: 12, suffix: 's', label: 'Avg. Analysis Time' },
  { target: 500, suffix: '+', label: 'Cases Analyzed Daily' },
  { target: 6, suffix: '+', label: 'AI Models Used' },
];

function StatCounter({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const [current, setCurrent] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const trigger = ScrollTrigger.create({
      trigger: ref.current,
      start: 'top 70%',
      once: true,
      onEnter: () => {
        const obj = { val: 0 };
        gsap.to(obj, {
          val: target,
          duration: 3.5,
          delay: 0.15,
          ease: 'power1.out',
          onUpdate: () => {
            setCurrent(obj.val);
          },
        });
      },
    });
    return () => trigger.kill();
  }, [target]);

  const displayVal = target % 1 !== 0 ? current.toFixed(1) : Math.floor(current);

  return (
    <div ref={ref}>
      <div className="stat-band-val">
        {displayVal}
        <span style={{ fontSize: '0.6em' }}>{suffix}</span>
      </div>
      <div className="stat-band-label">{label}</div>
    </div>
  );
}

const testimonials = [
  { quote: 'OcnoDetect has fundamentally changed how I prepare for MDT meetings. The AI staging is accurate enough that I use it as a cross-check before presenting.', name: 'Dr. R. Krishnamurthy', role: 'Head & Neck Surgical Oncologist, AIIMS' },
  { quote: 'The case-anchored chat feature is unlike anything I have used. I can ask specific surgical questions and get answers contextualized to my exact patient.', name: 'Dr. P. Anand', role: 'Senior Consultant ENT Surgeon, Apollo' },
  { quote: 'Having NCCN protocols surfaced automatically alongside PubMed papers saves me 30+ minutes per case. Absolutely invaluable for a high-volume unit.', name: 'Dr. S. Mehta', role: 'Head & Neck Oncology Fellow, Tata Memorial' },
  { quote: 'The automated margin clearance extraction and ENE detection from unstructured pathology PDFs is surprisingly thorough and fast.', name: 'Dr. Ananya Sen', role: 'Radiation Oncologist, Fortis Healthcare' },
  { quote: 'OcnoDetect streamlines surgical decision-making for complex oral cavity and larynx cases. The multi-modal insights are spot on.', name: 'Dr. Vikramaditya Rao', role: 'Chief of Surgical Oncology, Max Healthcare' },
  { quote: 'Instant DICOM analysis coupled with evidence retrieval gives our tumor board complete confidence during pre-op case discussions.', name: 'Dr. Maya Deshmukh', role: 'Consultant Head & Neck Surgeon, Manipal' },
];

export default function Landing() {
  const navigate = useNavigate();
  const { token, userProfile } = useApp();
  const isLoggedIn = Boolean(token || userProfile);
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [activeLegalModal, setActiveLegalModal] = useState<'privacy' | 'terms' | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const showcaseRef = useRef<HTMLDivElement>(null);
  const featRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const testimonialsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll and prevent Lenis leakage when modal is open
  useEffect(() => {
    if (activeLegalModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeLegalModal]);

  // Lenis Smooth Scroll Integration synced with GSAP
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 2,
    });

    lenis.scrollTo(0, { immediate: true });
    lenis.on('scroll', ScrollTrigger.update);

    const updateRaf = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateRaf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(updateRaf);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero entrance
      const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      heroTl
        .from('.hero-badge',   { y: 30, opacity: 0, duration: 0.7, clearProps: 'all' })
        .from('.hero-title',   { y: 40, opacity: 0, duration: 0.8, clearProps: 'all' }, '-=0.4')
        .from('.hero-sub',     { y: 30, opacity: 0, duration: 0.7, clearProps: 'all' }, '-=0.5')
        .from('.hero-actions', { y: 25, opacity: 0, duration: 0.6, clearProps: 'all' }, '-=0.4');

      // GSAP Pinning for Interactive Showcase Section
      if (showcaseRef.current) {
        ScrollTrigger.create({
          trigger: showcaseRef.current,
          start: 'top 72px',
          end: '+=1200',
          pin: true,
          scrub: 0.5,
          onUpdate: (self) => {
            const step = self.progress < 0.35 ? 0 : self.progress < 0.7 ? 1 : 2;
            setActiveTab(step);
          },
        });
      }

      // Scroll triggered animations with clearProps & fallback
      if (featRef.current) {
        gsap.from('.feature-card', {
          scrollTrigger: {
            trigger: featRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
          y: 50,
          opacity: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: 'power3.out',
          clearProps: 'all',
        });
      }

      if (stepsRef.current) {
        gsap.from('.how-step', {
          scrollTrigger: {
            trigger: stepsRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
          y: 40,
          opacity: 0,
          duration: 0.6,
          stagger: 0.15,
          ease: 'power3.out',
          clearProps: 'all',
        });
      }

      if (statsRef.current) {
        gsap.from('.stat-band-val', {
          scrollTrigger: {
            trigger: statsRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
          y: 20,
          opacity: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out',
          clearProps: 'all',
        });
      }

      if (testimonialsRef.current) {
        gsap.from('.testimonial-card', {
          scrollTrigger: {
            trigger: testimonialsRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
          y: 40,
          opacity: 0,
          duration: 0.6,
          stagger: 0.12,
          ease: 'power3.out',
          clearProps: 'all',
        });
      }

      if (ctaRef.current) {
        gsap.from('.cta-band-title, .cta-band-sub, .cta-actions', {
          scrollTrigger: {
            trigger: ctaRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
          y: 30,
          opacity: 0,
          duration: 0.7,
          stagger: 0.12,
          ease: 'power3.out',
          clearProps: 'all',
        });
      }

      setTimeout(() => ScrollTrigger.refresh(), 100);
    });
    return () => ctx.revert();
  }, []);

  return (
    <div style={{ background: 'var(--bg)' }}>
      {/* Nav */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="landing-nav-logo">
          <HeartPulse size={20} color="var(--primary)" />
          <span className="landing-nav-logo-text">Ocno<span>Detect</span></span>
        </div>
        <div className="landing-nav-links">
          <a href="#features" className="landing-nav-link">Features</a>
          <a href="#how" className="landing-nav-link">How It Works</a>
          <a href="#testimonials" className="landing-nav-link">Testimonials</a>
        </div>
        <div className="landing-nav-actions">
          {isLoggedIn ? (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/dashboard')}>
              Go to Dashboard <ArrowRight size={13} />
            </button>
          ) : (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/login')}>Sign in</button>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/login')}>
                Get Started <ArrowRight size={13} />
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="hero" ref={heroRef}>
        <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
          <Ferrofluid
            colors={["#0EA5E9","#38BDF8","#ffffff"]}
            speed={0.5}
            scale={1.6}
            turbulence={1}
            fluidity={0.1}
            rimWidth={0.2}
            sharpness={2.5}
            shimmer={1.5}
            glow={2}
            flowDirection="down"
            opacity={1}
            mouseInteraction
            mouseStrength={1}
            mouseRadius={0.35}
          />
        </div>
        <div className="hero-bg" />
        <div className="hero-grid" />
        <div className="hero-content">
          <div className="hero-badge">
            <div className="hero-badge-dot" />
            AI-Powered Head &amp; Neck Oncology Platform
          </div>
          <h1 className="hero-title">
            Clinical Intelligence<br />
            for <span className="hero-title-accent">Oncology Surgeons</span>
          </h1>
          <p className="hero-sub">
            OcnoDetect analyzes CT scans and pathology reports, generates comprehensive TNM staging, and provides case-anchored AI consultation — all in under 15 seconds.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={() => navigate(isLoggedIn ? '/app/dashboard' : '/login')}>
              {isLoggedIn ? 'Go to Dashboard' : 'Start Free Trial'} <ArrowRight size={16} />
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => navigate('/app/dashboard')}>
              View Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* Interactive Showcase Section (GSAP Pinned) */}
      <section id="showcase" className="showcase-section" ref={showcaseRef}>
        <div className="showcase-container">
          <div className="section-header">
            <div className="section-eyebrow">Interactive Platform Experience</div>
            <h2 className="section-headline">Clinical Intelligence in Action</h2>
            <p className="section-desc">
              Explore how OcnoDetect transforms staging, clinical consultation, and evidence retrieval.
            </p>
          </div>

          {/* Interactive Nav Pills */}
          <div className="showcase-nav-pills">
            {[
              { id: 0, label: '01 · AI Staging & Findings', icon: ScanLine },
              { id: 1, label: '02 · Case-Anchored AI Chat', icon: MessageSquare },
              { id: 2, label: '03 · NCCN & PubMed Evidence', icon: BookOpen },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`showcase-pill ${activeTab === id ? 'active' : ''}`}
                onClick={() => setActiveTab(id)}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* Browser Window Mockup */}
          <div className="showcase-browser-card">
            <div className="showcase-browser-bar">
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} />
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <div className="showcase-browser-url">
                  <ShieldCheck size={12} color="var(--success)" />
                  ocnodetect.com/app/{activeTab === 0 ? 'scan' : activeTab === 1 ? 'chat' : 'references'}
                </div>
              </div>
            </div>

            <div className="showcase-card-body">
              {activeTab === 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, width: '100%', height: '100%' }}>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 6, letterSpacing: '0.08em' }}>Active Patient</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginBottom: 4 }}>PT-2024-8842</div>
                    <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginBottom: 12 }}>Base of Tongue &middot; T3N2bM0</div>
                    <div className="badge badge-success" style={{ fontSize: 10, width: 'fit-content' }}>Analysis Complete</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                        <div style={{ fontSize: 9.5, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TNM Stage</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)', marginTop: 2 }}>T3N2bM0</div>
                      </div>
                      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                        <div style={{ fontSize: 9.5, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confidence</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)', marginTop: 2 }}>95%</div>
                      </div>
                      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                        <div style={{ fontSize: 9.5, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AJCC Stage</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--warning)', marginTop: 2 }}>Stage IVA</div>
                      </div>
                    </div>
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--fg-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>SURGICAL CONSIDERATIONS</div>
                      <div style={{ fontSize: 12, color: 'var(--fg-secondary)', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div>&middot; <strong>Tracheostomy:</strong> Temporary surgical tracheostomy recommended due to anticipated glossal edema.</div>
                        <div>&middot; <strong>Reconstruction:</strong> Radial Forearm Free Flap (RFFF) for thin mucosal defect. Microvascular anastomosis to facial artery.</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 680, width: '100%', margin: '0 auto', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--fg-secondary)', flexShrink: 0 }}>DR</div>
                    <div style={{ background: 'var(--primary)', color: '#fff', padding: '10px 16px', borderRadius: '12px 4px 12px 12px', fontSize: 12.5, lineHeight: 1.5 }}>
                      What is the recommended nodal neck dissection protocol for T3N2b Base of Tongue cancer?
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                      <Bot size={16} />
                    </div>
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: '4px 12px 12px 12px', fontSize: 12.5, lineHeight: 1.55, color: 'var(--fg-secondary)' }}>
                      For <strong>T3N2b Base of Tongue (BOT)</strong> carcinoma, NCCN guidelines recommend <strong>ipsilateral comprehensive neck dissection (Levels I-V)</strong> combined with contralateral selective neck dissection (Levels II-IV) due to high risk of bilateral lymphatic drainage.
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 2 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%', height: '100%' }}>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <ShieldCheck size={14} color="var(--primary)" />
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>NCCN Stage Sub-Protocols</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--fg-secondary)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div>&middot; Primary surgical resection with frozen section margin control</div>
                      <div>&middot; Adjuvant chemoradiotherapy with concurrent Cisplatin for ENE(+) status</div>
                      <div>&middot; Post-treatment PET/CT at 12 weeks for response assessment</div>
                    </div>
                  </div>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <FileText size={14} color="var(--primary)" />
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--fg)', letterSpacing: '0.05em' }}>PubMed Research</span>
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>Surgical Outcomes in Advanced BOT Resection</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 10 }}>Chen et al. &middot; Oral Oncology 2024 &middot; 142 citations</div>
                    <div className="badge badge-primary" style={{ fontSize: 9, width: 'fit-content' }}>Surgical Technique</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '80px 32px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }} ref={featRef}>
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
          <div className="section-header">
            <div className="section-eyebrow">Capabilities</div>
            <h2 className="section-headline">Built for clinical precision</h2>
            <p className="section-desc">Every feature is designed to reduce cognitive load and enhance decision-making at the point of care.</p>
          </div>
          <div className="features-grid">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="feature-card">
                <div className="feature-icon"><Icon size={22} /></div>
                <h3 className="feature-title">{title}</h3>
                <p className="feature-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={{ padding: '80px 32px' }} ref={stepsRef}>
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
          <div className="section-header">
            <div className="section-eyebrow">Workflow</div>
            <h2 className="section-headline">From upload to insight in seconds</h2>
            <p className="section-desc">A streamlined three-step workflow that integrates into your existing clinical routine.</p>
          </div>
          <div className="how-steps">
            {steps.map(({ num, title, desc }) => (
              <div key={num} className="how-step">
                <div className="how-step-num">{num}</div>
                <h3 className="how-step-title">{title}</h3>
                <p className="how-step-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats band */}
      <div className="stats-band" ref={statsRef}>
        <div className="stats-band-grid">
          {statsData.map(({ target, suffix, label }) => (
            <StatCounter key={label} target={target} suffix={suffix} label={label} />
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <section id="testimonials" style={{ padding: '80px 0' }} ref={testimonialsRef}>
        <div>
          <div className="section-header">
            <div className="section-eyebrow">Testimonials</div>
            <h2 className="section-headline">Trusted by clinicians</h2>
          </div>
          <div className="testimonials-marquee-container">
            <div className="testimonials-marquee-track">
              {[...testimonials, ...testimonials].map(({ quote, name, role }, idx) => (
                <div key={idx} className="testimonial-card marquee-item">
                  <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
                    {[...Array(5)].map((_, i) => <Star key={i} size={13} color="var(--warning)" fill="var(--warning)" />)}
                  </div>
                  <p className="testimonial-quote">"{quote}"</p>
                  <div className="testimonial-author">
                    <div className="testimonial-avatar">{name.split(' ').map(w => w[0]).filter((_,i,a) => i === 1 || i === a.length-1).join('')}</div>
                    <div>
                      <div className="testimonial-name">{name}</div>
                      <div className="testimonial-role">{role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <div className="cta-band" ref={ctaRef}>
        <h2 className="cta-band-title">Ready to transform your clinical workflow?</h2>
        <p className="cta-band-sub">Join oncology surgeons using OcnoDetect to deliver faster, more accurate diagnostic summaries.</p>
        <div className="cta-actions" style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-lg" onClick={() => navigate(isLoggedIn ? '/app/dashboard' : '/login')}>
            {isLoggedIn ? 'Go to Dashboard' : 'Get Started Free'} <ArrowRight size={16} />
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => navigate('/app/dashboard')}>
            View Dashboard
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <HeartPulse size={18} color="var(--primary)" />
              <span style={{ fontSize: 16, fontWeight: 700 }}>Ocno<span style={{ color: 'var(--primary)' }}>Detect</span></span>
            </div>
            <p className="footer-brand-desc">AI-powered head and neck oncology clinical intelligence platform for surgeons. Faster staging. Sharper decisions.</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn-icon" onClick={() => navigate('/app/dashboard')} title="Surgical Dashboard"><Activity size={14} /></button>
              <button className="btn-icon" onClick={() => navigate('/app/scan')} title="AI Scan Staging"><ScanLine size={14} /></button>
              <button className="btn-icon" onClick={() => navigate('/app/chat')} title="Case-Anchored Chat"><Bot size={14} /></button>
            </div>
          </div>

          <div>
            <div className="footer-col-title">Platform</div>
            <div className="footer-links">
              <span className="footer-link" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Platform Features</span>
              <span className="footer-link" onClick={() => document.getElementById('showcase')?.scrollIntoView({ behavior: 'smooth' })}>Interactive Showcase</span>
              <span className="footer-link" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>Clinical Workflow</span>
              <span className="footer-link" onClick={() => document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' })}>Clinician Reviews</span>
            </div>
          </div>

          <div>
            <div className="footer-col-title">Clinical App</div>
            <div className="footer-links">
              <span className="footer-link" onClick={() => navigate('/app/scan')}>AI Scan Staging</span>
              <span className="footer-link" onClick={() => navigate('/app/chat')}>Case-Anchored Chat</span>
              <span className="footer-link" onClick={() => navigate('/app/references')}>NCCN Guidelines</span>
              <span className="footer-link" onClick={() => navigate('/app/dashboard')}>Surgical Dashboard</span>
            </div>
          </div>

          <div>
            <div className="footer-col-title">Legal &amp; Compliance</div>
            <div className="footer-links">
              <span className="footer-link" onClick={() => setActiveLegalModal('privacy')} style={{ color: 'var(--primary)', fontWeight: 600 }}>Privacy Policy</span>
              <span className="footer-link" onClick={() => setActiveLegalModal('terms')} style={{ color: 'var(--primary)', fontWeight: 600 }}>Terms of Service</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span className="footer-copyright">&copy; 2026 OcnoDetect. All rights reserved.</span>
          <span className="footer-copyright">AI-generated content — Final clinical responsibility remains with the surgeon</span>
        </div>
      </footer>

      {/* Legal Modal */}
      {activeLegalModal && (
        <div
          className="modal-backdrop"
          onClick={() => setActiveLegalModal(null)}
          onWheel={e => e.stopPropagation()}
          data-lenis-prevent
        >
          <div
            className="modal"
            onClick={e => e.stopPropagation()}
            onWheel={e => e.stopPropagation()}
            data-lenis-prevent
            style={{ maxWidth: 680, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overscrollBehavior: 'contain' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} color="var(--primary)" />
                <h2 className="modal-title" style={{ margin: 0, fontSize: 18 }}>
                  {activeLegalModal === 'privacy' ? 'OcnoDetect Clinical Privacy Policy' : 'OcnoDetect Terms of Service & Clinical Disclaimer'}
                </h2>
              </div>
              <button className="btn-icon" style={{ border: 'none', padding: 6 }} onClick={() => setActiveLegalModal(null)}>
                <X size={15} />
              </button>
            </div>

            <div
              className="modal-body"
              data-lenis-prevent
              style={{ flex: 1, overflowY: 'auto', paddingRight: 6, fontSize: 13, lineHeight: 1.7, color: 'var(--fg-secondary)', overscrollBehavior: 'contain' }}
              onWheel={e => e.stopPropagation()}
            >
              {activeLegalModal === 'privacy' ? (
                <>
                  <p style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                    Last Updated: January 2026 &middot; HIPAA &amp; GDPR Compliant Data Governance
                  </p>
                  
                  <h4 style={{ color: 'var(--fg)', fontSize: 14, marginTop: 12, marginBottom: 4 }}>1. Protected Health Information (PHI) &amp; Encryption Standards</h4>
                  <p>OcnoDetect enforces strict technical and administrative safeguards to protect diagnostic imaging data, CT DICOM slice metadata, and pathology PDF reports. All data transmissions are encrypted using TLS 1.3 protocols, and stationary database storage is secured with AES-256 military-grade encryption.</p>

                  <h4 style={{ color: 'var(--fg)', fontSize: 14, marginTop: 14, marginBottom: 4 }}>2. De-identification &amp; Multimodal AI Processing</h4>
                  <p>Diagnostic media uploaded to OcnoDetect is processed via isolated Gemini 1.5 Pro and Llama 3 Vision pipelines solely to calculate AJCC 8th Edition TNM staging parameters and extract surgical considerations. Patient identifiers are stripped using HIPAA Safe Harbor guidelines. Uploaded clinical media is never retained for public model training or disclosed to third-party data brokers.</p>

                  <h4 style={{ color: 'var(--fg)', fontSize: 14, marginTop: 14, marginBottom: 4 }}>3. Multi-Tenant Account Segregation</h4>
                  <p>Each clinician account operates within an isolated cryptographic tenant space. Access to saved patient case registries, staging histories, and AI consultation logs is restricted strictly to the authenticated credentials of the attending surgeon.</p>

                  <h4 style={{ color: 'var(--fg)', fontSize: 14, marginTop: 14, marginBottom: 4 }}>4. Data Ownership &amp; Irreversible Purge</h4>
                  <p>Clinicians retain complete ownership of their clinical summaries. Executing the "Clear All Case Data" directive in the user settings permanently and irreversibly purges all uploaded scans, pathology summaries, and session transcripts from our production servers.</p>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                    Important Medical Notice &middot; Clinical Decision Support System (CDSS)
                  </p>

                  <h4 style={{ color: 'var(--fg)', fontSize: 14, marginTop: 12, marginBottom: 4 }}>1. Scope of Intended Use</h4>
                  <p>OcnoDetect is a specialized Clinical Decision Support System (CDSS) designed exclusively for use by licensed medical practitioners, head and neck surgical oncologists, ENT specialists, and multidisciplinary tumor board (MDT) members. It does not constitute a standalone medical diagnostic device or autonomous clinical decision-maker.</p>

                  <h4 style={{ color: 'var(--fg)', fontSize: 14, marginTop: 14, marginBottom: 4 }}>2. Mandatory Physician Verification &amp; Final Responsibility</h4>
                  <p>All TNM staging outputs, tumor margin estimations, extranodal extension (ENE) flags, and treatment protocol recommendations generated by OcnoDetect AI are advisory in nature. The treating physician must independently verify all AI outputs against primary DICOM scans, biopsy findings, and clinical examinations. <strong>Final diagnostic authority, treatment planning, and surgical execution remain strictly with the attending surgeon.</strong></p>

                  <h4 style={{ color: 'var(--fg)', fontSize: 14, marginTop: 14, marginBottom: 4 }}>3. Authorized Practitioner Credentials</h4>
                  <p>By registering an account on OcnoDetect, you certify that you hold a valid, active medical license or authorized clinical research credential in your operating jurisdiction.</p>

                  <h4 style={{ color: 'var(--fg)', fontSize: 14, marginTop: 14, marginBottom: 4 }}>4. Limitation of Liability</h4>
                  <p>OcnoDetect, its parent entity, and software developers disclaim all liability for clinical management decisions, surgical complications, or diagnostic outcomes resulting from reliance upon AI-generated analytical summaries.</p>
                </>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setActiveLegalModal(null)}>
                I Understand &amp; Agree
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

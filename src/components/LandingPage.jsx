import React, { useState, useEffect, useRef } from 'react';
import { Zap, Trophy, Users, Flame, Code2, ChevronDown, Medal, Activity } from 'lucide-react';

/* Reveal-on-scroll hook */
function useInView(options) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.25, ...options }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return [ref, inView];
}

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/* Count-up number that animates when scrolled into view */
function Counter({ to, suffix = '', duration = 1700 }) {
  const [ref, inView] = useInView({ threshold: 0.4 });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf;
    let start;
    const step = (t) => {
      if (start === undefined) start = t;
      const p = Math.min((t - start) / duration, 1);
      setVal(easeOut(p) * to);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  const display = to >= 1000 ? Math.floor(val).toLocaleString() : Math.floor(val);
  return <span ref={ref}>{display}{suffix}</span>;
}

/* Section wrapper that reveals its children when scrolled into view */
function Section({ className = '', children }) {
  const [ref, inView] = useInView({ threshold: 0.2 });
  return (
    <section ref={ref} className={`lp-section ${className} ${inView ? 'in-view' : ''}`}>
      {children}
    </section>
  );
}

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/* Demo activity grid (GitHub-style) — deterministic levels */
const HEATMAP_WEEKS = 26;
function buildHeatmap() {
  const cells = [];
  for (let w = 0; w < HEATMAP_WEEKS; w++) {
    for (let d = 0; d < 7; d++) {
      const seed = (w * 7 + d) * 2654435761;
      const r = ((seed >> 8) & 0xff) / 255;
      let level = 0;
      if (r > 0.82) level = 4;
      else if (r > 0.62) level = 3;
      else if (r > 0.4) level = 2;
      else if (r > 0.22) level = 1;
      cells.push({ w, d, level });
    }
  }
  return cells;
}
const HEATMAP_CELLS = buildHeatmap();

const PODIUM = [
  { name: 'Sarah', place: 2, tint: '#c2ccd8', solved: 842, h: 130 },
  { name: 'Alex', place: 1, tint: '#e8b53e', solved: 1024, h: 180 },
  { name: 'Dev', place: 3, tint: '#c1814c', solved: 765, h: 95 },
];

/* ---- Horizontal scroll-accumulation feature section ----
   A 300vh section with a sticky stage. As you scroll, cards slide in from the
   right and accumulate side by side, all at the same size. The scroll handler
   replicates Framer Motion's useScroll + useTransform by mapping the section's
   scroll progress (0→1) onto each card's opacity / x / y / blur. */
const ACC_FEATURES = [
  {
    id: 1, eyebrow: 'TRACK PROGRESS', Icon: Activity, title: 'Track Progress',
    desc: 'Monitor solved problems, difficulty breakdown, and topic coverage.', kind: 'stats',
  },
  {
    id: 2, eyebrow: 'BUILD STREAKS', Icon: Flame, title: 'Build Streaks',
    desc: 'Visualize consistency with heatmaps, streaks, and weekly goals.', kind: 'heatmap',
  },
  {
    id: 3, eyebrow: 'COMPETE GLOBALLY', Icon: Trophy, title: 'Compete Globally',
    desc: 'Compare rankings with friends, universities, and developers worldwide.', kind: 'podium',
  },
];

// scroll phases: [0 .. DETAILS_END] the intro details fade out, then the cards
// rise up and accumulate across the rest of the scroll.
const DETAILS_END = 0.22;

function AccumulateFeatures() {
  const sectionRef = useRef(null);
  const headRef = useRef(null);
  const cardRefs = useRef([]);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const sec = sectionRef.current;
      if (!sec) return;
      const mobile = window.innerWidth <= 768;
      const travel = sec.offsetHeight - window.innerHeight;
      const p = travel > 0 ? clamp(-sec.getBoundingClientRect().top / travel, 0, 1) : 0;
      const N = ACC_FEATURES.length;

      // 1) Intro details: fade out + rise up over the first phase.
      const head = headRef.current;
      if (head) {
        if (mobile) { head.style.opacity = ''; head.style.transform = ''; }
        else {
          const ht = easeInOut(clamp((p - 0.02) / (DETAILS_END - 0.04), 0, 1));
          head.style.opacity = String(1 - ht);
          head.style.transform = `translate(-50%, calc(-50% - ${ht * 60}px))`;
        }
      }

      // 2) Cards: after the details fade, rise up and accumulate left → right.
      const seg = (1 - DETAILS_END) / N;
      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        if (mobile) { el.style.opacity = ''; el.style.transform = ''; el.style.filter = ''; return; }
        const start = DETAILS_END + i * seg;
        const end = start + seg * 0.72;
        const t = easeInOut(clamp((p - start) / (end - start), 0, 1));

        const y = (1 - t) * 80;                 // rise up into place
        const x = i === 0 ? 0 : (1 - t) * 90;   // later cards also slide in from the right
        const blur = (1 - t) * 10;

        // No per-card scaling. Each card used to shrink to 93% once the next
        // one entered, so the row settled at three different sizes (93%, 93%,
        // 100%) and read as inconsistent rather than as one set.
        el.style.opacity = String(t);
        el.style.transform = `translate(${x}px, ${y}px)`;
        el.style.filter = blur > 0.05 ? `blur(${blur}px)` : 'none';
      });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={sectionRef} className="acc-section">
      <div className="acc-sticky">
        <div className="acc-inner">
          <header className="acc-head" ref={headRef}>
            <div className="lp-eyebrow"><Zap size={16} /> WHY DEVELOPERS LOVE IT</div>
            <h2 className="acc-title">Everything you need to level up.</h2>
            <p className="acc-head-sub">Three tools that turn grinding problems into a daily habit you actually look forward to.</p>
          </header>
          <div className="acc-row">
            {ACC_FEATURES.map((c, i) => {
              const Icon = c.Icon;
              return (
                <div key={c.id} ref={(el) => { cardRefs.current[i] = el; }} className="acc-card lp-card">
                  <div className="acc-card-num">0{c.id}</div>
                  <div className="lp-eyebrow"><Icon size={15} /> {c.eyebrow}</div>
                  <h3 className="acc-card-title">{c.title}</h3>
                  <p className="acc-card-desc">{c.desc}</p>

                  <div className="acc-visual">
                    {c.kind === 'stats' && (
                      <div className="acc-stats">
                        <div className="acc-stat"><span className="acc-stat-n">1,250</span><span className="acc-stat-l">problems solved</span></div>
                        <div className="acc-diff">
                          <div className="acc-diff-row"><span>Easy</span><div className="acc-bar"><i style={{ width: '82%', background: '#5bb98c' }} /></div></div>
                          <div className="acc-diff-row"><span>Medium</span><div className="acc-bar"><i style={{ width: '56%', background: '#e0a23f' }} /></div></div>
                          <div className="acc-diff-row"><span>Hard</span><div className="acc-bar"><i style={{ width: '28%', background: '#d9645e' }} /></div></div>
                        </div>
                      </div>
                    )}
                    {c.kind === 'heatmap' && (
                      <>
                        <div className="lp-heatmap">
                          {HEATMAP_CELLS.map((cell, k) => (
                            <span key={k} className={`hm-cell hm-l${cell.level}`} />
                          ))}
                        </div>
                        <div className="lp-heatmap-legend">
                          <span>Less</span>
                          <span className="hm-cell hm-l0" /><span className="hm-cell hm-l1" />
                          <span className="hm-cell hm-l2" /><span className="hm-cell hm-l3" />
                          <span className="hm-cell hm-l4" />
                          <span>More</span>
                        </div>
                      </>
                    )}
                    {c.kind === 'podium' && (
                      <div className="lp-podium">
                        {PODIUM.map((p) => (
                          <div key={p.name} className={`lp-podium-col lp-place-${p.place}`}>
                            <div className="lp-podium-medal"><Medal size={20} color={p.tint} strokeWidth={2.2} /></div>
                            <div className="lp-podium-name">{p.name}</div>
                            <div className="lp-podium-solved">{p.solved} solved</div>
                            <div className="lp-podium-bar" style={{ '--bar-h': `${p.h * 0.55}px` }}>
                              <span className="lp-podium-place">{p.place}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage({ onNavigate }) {
  const rootRef = useRef(null);

  // Cursor "eraser" spotlight — follows the mouse and wipes away the overlay.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;
    let mx = window.innerWidth / 2;
    let my = window.innerHeight * 0.4;
    const apply = () => {
      raf = 0;
      root.style.setProperty('--mx', `${mx}px`);
      root.style.setProperty('--my', `${my}px`);
    };
    const onMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="landing-page" ref={rootRef}>
      <video
        className="hero-bg-video"
        src="/hero.mp4"
        autoPlay
        loop
        muted
        playsInline
      />
      <div className="hero-bg-overlay" />
      <div className="cursor-glow" />

      <div className="lp-scroll">
        {/* HERO */}
        <section className="lp-section hero-section in-view">
          <div className="hero-content">
            <div className="hero-badge">DEVELOPER GROWTH PLATFORM</div>
            <h1 className="game-title">
              <span className="title-line">LEETCODE</span>
              <span className="title-line title-accent">ARENA</span>
            </h1>
            <p className="game-tagline">
              Track your progress, build streaks, and compete with friends.
              Turn grinding problems into a cozy daily ritual.
            </p>
            <div className="menu-options">
              <button className="pixel-button primary" onClick={() => onNavigate('auth-choice')}>
                <Zap size={16} /> GET STARTED
              </button>
            </div>
            <div className="hero-stats">
              <div className="hero-stat"><Flame size={15} /> Daily streaks</div>
              <div className="hero-stat"><Trophy size={15} /> Live leaderboard</div>
              <div className="hero-stat"><Users size={15} /> Friend battles</div>
            </div>
          </div>
          <div className="scroll-cue"><ChevronDown size={22} /></div>
        </section>

        {/* STATS */}
        <Section className="stats-section">
          <div className="lp-card stats-card">
            <div className="lp-stat">
              <div className="lp-stat-num"><Counter to={1250} suffix="+" /></div>
              <div className="lp-stat-label">Problems Solved</div>
            </div>
            <div className="lp-stat">
              <div className="lp-stat-num"><Counter to={300} suffix="+" /></div>
              <div className="lp-stat-label">Active Users</div>
            </div>
            <div className="lp-stat">
              <div className="lp-stat-num"><Counter to={12} suffix="M+" /></div>
              <div className="lp-stat-label">Lines of Code Saved</div>
            </div>
          </div>
        </Section>

        {/* FEATURES — horizontal scroll accumulation */}
        <AccumulateFeatures />

        {/* CTA */}
        <Section className="cta-section">
          <div className="cta-inner">
            <Code2 size={32} className="cta-icon" />
            <h2 className="cta-title">Stop Solving Alone.</h2>
            <p className="cta-lines">Track progress. Save solutions. Compete with friends.</p>
            <button className="pixel-button primary cta-button" onClick={() => onNavigate('auth-choice')}>
              <Zap size={16} /> GET STARTED — IT'S FREE
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}

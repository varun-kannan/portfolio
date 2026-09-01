import { useTilt, useMagnetic } from '../hooks/useMotion';
import { SectionHead, Tags, TextureInverted } from './Chrome';
import HalftoneBackdrop from './HalftoneBackdrop';
import SignatureMark from './SignatureMark';
import {
  SPEC, MARQUEE, WORK, EXPERIENCE_POINTS, CAPABILITIES,
  PROJECTS, APPROACH, EMAIL, GITHUB, LINKEDIN,
} from '../data/content';

const RESUME_MAILTO = `mailto:${EMAIL}?subject=R%C3%A9sum%C3%A9%20request`;

export function Hero() {
  const specRef = useTilt({ depth: 0.7, lift: 20 });
  const ctaRef = useMagnetic({ strength: 14 });
  return (
    <header id="top" className="wrap scene" style={{ position: 'relative', paddingTop: 96, overflow: 'hidden' }}>
      <div className="ghost" aria-hidden="true" style={{ right: '-1vw', bottom: '-4vh', fontStyle: 'italic', fontSize: 'clamp(180px,30vw,430px)' }}>VN</div>

      {/* v20's side rail — rotated standfirst, rule, year */}
      <div className="rail" aria-hidden="true">
        <span className="m">Software engineer · Chennai</span>
        <span className="rail-line" />
        <span className="m rail-year">2026</span>
      </div>

      {/* v20's meta row above the headline */}
      <div className="rv metarow">
        <span className="m" style={{ color: 'var(--accent)' }}>Portfolio</span>
        <span className="m" style={{ marginLeft: 'auto', color: 'var(--muted)' }}>Surfboard Payments · since 2022</span>
      </div>

      <div className="g-hero preserve" style={{ display: 'grid', gridTemplateColumns: '1.62fr .38fr', gap: 64, alignItems: 'start' }}>
        <h1 className="rv" style={{ position: 'relative', fontSize: 'clamp(44px,8.4vw,148px)', letterSpacing: '-.045em', lineHeight: 1.04, fontWeight: 900 }}>
          Varun N<span style={{ color: 'var(--accent)' }}>.</span>
        </h1>

        <div className="par-y" data-py="40">
        <div className="rv card" ref={specRef} style={{ paddingTop: 10 }}>
          <div className="m" data-layer="1.2" style={{ color: 'var(--muted)', paddingBottom: 10, borderBottom: '1px solid var(--fg)' }}>Specification</div>
          {SPEC.map(([k, v, isAccent], i) => (
            <div key={k} data-layer={(0.9 - i * 0.08).toFixed(2)}
              style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '11px 0', borderBottom: i === SPEC.length - 1 ? 'none' : '1px dashed var(--hair)' }}>
              <span className="m" style={{ color: 'var(--muted)' }}>{k}</span>
              <span className="m m-plain" style={isAccent ? { color: 'var(--accent)' } : undefined}>{v}</span>
            </div>
          ))}
        </div>
        </div>
      </div>

      <div className="rv dev live-rule g-about" style={{ position: 'relative', display: 'grid', gridTemplateColumns: '.14fr .52fr .34fr', gap: 48, marginTop: 64, paddingTop: 34, borderTop: '1px solid var(--fg)' }}>
        <div className="m" style={{ color: 'var(--muted)' }}>About</div>
        <p style={{ fontSize: 'clamp(20px,2.3vw,31px)', lineHeight: 1.24, letterSpacing: '-.02em', textWrap: 'pretty' }}>
          I build the software that turns a tap into an authorization — terminal apps, acquirer integrations, and the fleet services behind them.
        </p>
        <div>
          <p style={{ fontStyle: 'italic', color: 'var(--accent)', fontSize: 16, lineHeight: 1.5, textWrap: 'pretty' }}>
            Four years in one authorization path — deep enough to know where it breaks.
          </p>
          <p style={{ fontSize: 15.5, color: 'var(--muted)', lineHeight: 1.66, marginTop: 14, textWrap: 'pretty' }}>
            Software engineer at Surfboard Payments since 2022. I write acquirer integrations inside PCI-DSS scope, own the terminal management system behind 35,000 registered devices, and built the offline path that lets a card go through when the network won't.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
            <a href="#work" ref={ctaRef} className="m lift" style={{ background: 'var(--fg)', color: 'var(--bg)', padding: '13px 16px 13px 22px', display: 'inline-flex', alignItems: 'center', gap: 16 }}>
              View selected work<span className="pix" aria-hidden="true"><i>→</i><b>→</b></span>
            </a>
            <a href="#contact" className="m lift" style={{ border: '1px dashed var(--rule)', padding: '14px 22px' }}>Contact</a>
            <a href={RESUME_MAILTO} className="m lift" style={{ border: '1px dashed var(--rule)', padding: '14px 22px' }}>Ask for my résumé</a>
          </div>
        </div>
      </div>
    </header>
  );
}

export function Marquee() {
  const strip = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 46, paddingRight: 46, fontSize: 'clamp(19px,2vw,29px)', letterSpacing: '-.02em', fontWeight: 500 }}>
      {MARQUEE.map((t) => (
        <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 46, whiteSpace: 'nowrap' }}>
          {t}<span className="dot" />
        </span>
      ))}
    </div>
  );
  return (
    <div className="marquee scene" style={{ marginTop: 72, borderTop: '1px dashed var(--rule)', borderBottom: '1px dashed var(--rule)', overflow: 'hidden', padding: '22px 0' }}>
      <div className="tilt-scroll" data-tilt="3">
        <div className="marquee-track">
          {strip}
          <div aria-hidden="true" style={{ display: 'contents' }}>{strip}</div>
        </div>
      </div>
    </div>
  );
}

function WorkRow({ item, first }) {
  return (
    <article className={`rv row g-row z-drift${first ? ' live-rule' : ''}`} data-drift="22"
      style={{ display: 'grid', gridTemplateColumns: '.14fr .28fr .42fr .16fr', gap: 34, marginTop: first ? 52 : 0, padding: '34px 0', borderTop: first ? '1px solid var(--fg)' : '1px dashed var(--rule)' }}>
      <div className="m" style={{ color: 'var(--muted)' }}>{item.id}</div>
      <div>
        <h3 style={{ fontSize: 'clamp(22px,2.4vw,33px)' }}>{item.title}</h3>
        <div className="m" style={{ color: 'var(--muted)', marginTop: 9 }}>{item.role}</div>
      </div>
      <div>
        {item.body.map((p, i) => (
          <p key={i} style={{ fontSize: 16, lineHeight: 1.6, marginTop: i ? 14 : 0, color: i ? 'var(--muted)' : undefined, textWrap: 'pretty' }}>{p}</p>
        ))}
        {item.seam && (
          <div style={{ display: 'flex', gap: 16, alignItems: 'baseline', flexWrap: 'wrap', borderTop: '1px dashed var(--rule)', marginTop: 18, paddingTop: 14 }}>
            <span className="m" style={{ color: 'var(--accent)', whiteSpace: 'nowrap' }}>The seam</span>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, flex: 1, minWidth: '15rem', textWrap: 'pretty' }}>{item.seam}</p>
          </div>
        )}
        {item.metrics && <p className="m m-plain" style={{ fontSize: 13, marginTop: 16 }}>{item.metrics}</p>}
        <Tags items={item.tags} />
      </div>
      <div className="m" style={{ color: 'var(--muted)', textAlign: 'right' }}>{item.when}</div>
    </article>
  );
}

export function Work() {
  return (
    <section id="work" className="wrap scene-deep" style={{ position: 'relative', paddingTop: 104, scrollMarginTop: 70, overflow: 'hidden' }}>
      <div className="ghost" aria-hidden="true" style={{ left: '-2vw', top: 150, fontSize: 'clamp(110px,17vw,270px)' }}>AUTHORIZATION</div>
      <SectionHead index="01 — Work" title="Systems I've" em="shipped" aside="5 selected · 12 owned" />
      <div className="preserve">
        {WORK.map((item, i) => <WorkRow key={item.id} item={item} first={i === 0} />)}
      </div>
      <div className="rv live-rule" style={{ borderTop: '1px solid var(--fg)', borderBottom: '1px solid var(--fg)', marginTop: 8, padding: '26px 0', display: 'flex', alignItems: 'baseline', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-.02em' }}>Also owned</div>
        <div style={{ fontSize: 15.5, color: 'var(--muted)', flex: 1, minWidth: '18rem', textWrap: 'pretty' }}>
          fin-key scheduling · shared terminal libraries · Surf-Buggies signing worker · developer &amp; partner APIs · service consolidation across ~87 services
        </div>
      </div>
    </section>
  );
}

export function Experience() {
  const ref = useTilt({ depth: 0.5, lift: 18 });
  return (
    <section id="experience" className="wrap scene" style={{ paddingTop: 104, scrollMarginTop: 70 }}>
      <SectionHead index="02 — Experience" title="Where I've" em="worked" aside="1 company" />
      <div className="rv cell card" ref={ref} style={{ marginTop: 46, border: '1px dashed var(--rule)', padding: '34px 38px 38px' }}>
        <span className="tick" style={{ top: 0, left: 0, borderTopWidth: 1, borderLeftWidth: 1 }} />
        <span className="tick" style={{ bottom: 0, right: 0, borderBottomWidth: 1, borderRightWidth: 1 }} />
        <div data-layer="1.3">
          <div className="m" style={{ color: 'var(--muted)' }}>Feb 2022 — present · 4+ years</div>
          <h3 style={{ fontSize: 'clamp(26px,3vw,40px)', marginTop: 14 }}>Surfboard Payments</h3>
          <div className="m" style={{ color: 'var(--muted)', marginTop: 8 }}>Software Engineer · Chennai, India</div>
        </div>
        <p data-layer="0.8" style={{ fontSize: 16.5, lineHeight: 1.62, marginTop: 22, maxWidth: '80ch', textWrap: 'pretty' }}>
          Joined as an intern and stayed. I work across the authorization path — terminal software, acquirer integrations, card cryptography and the fleet services that keep 25,000 live devices configured and reachable.
        </p>
        <div data-layer="0.5" style={{ marginTop: 26 }}>
          {EXPERIENCE_POINTS.map((p, i) => (
            <div key={p} style={{ borderTop: '1px dashed var(--rule)', borderBottom: i === EXPERIENCE_POINTS.length - 1 ? '1px dashed var(--rule)' : undefined, padding: '14px 0', fontSize: 15.5 }}>{p}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CapCard({ cap, i }) {
  const ref = useTilt({ depth: 1.1, lift: 30 });
  return (
    <div ref={ref} className={`card${i === 0 ? ' halftone' : ''}`} style={{ borderTop: '1px solid var(--fg)', padding: i === 0 ? '16px 16px 4px' : '16px 0 4px' }}>
      <div className="m" data-layer="1.4" style={{ color: i === 0 ? 'var(--accent)' : 'var(--muted)' }}>{cap.n} / {cap.area}</div>
      <h3 data-layer="1" style={{ fontSize: 19, marginTop: 12, lineHeight: 1.18 }}>{cap.title}</h3>
      <div data-layer="0.5" style={{ fontSize: 14.5, color: 'var(--muted)', lineHeight: 2, marginTop: 14 }}>
        {cap.items.map((it) => <div key={it}>— {it}</div>)}
      </div>
    </div>
  );
}

export function Capabilities() {
  return (
    <section id="capabilities" className="wrap scene-deep" style={{ position: 'relative', paddingTop: 104, scrollMarginTop: 70, overflow: 'hidden' }}>
      <div className="ghost" aria-hidden="true" style={{ left: '-1vw', top: 160, fontSize: 'clamp(110px,17vw,260px)' }}>DEPTH</div>
      <SectionHead index="03 — Capabilities" title="What I build" em="with" aside="5 areas" />
      <div className="rv g-cap preserve" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 34, marginTop: 46 }}>
        {CAPABILITIES.map((cap, i) => <CapCard key={cap.n} cap={cap} i={i} />)}
      </div>
    </section>
  );
}

function ProjectCard({ p, i }) {
  const ref = useTilt({ depth: 1, lift: 34 });
  return (
    <div ref={ref} className={`card cell${i === 0 ? ' halftone' : ''}`}
      style={{ borderRight: '1px dashed var(--rule)', borderBottom: '1px dashed var(--rule)', padding: '32px 34px 34px' }}>
      <span className="tick" style={i === 0 ? { top: 0, left: 0, borderTopWidth: 1, borderLeftWidth: 1 } : { top: 0, right: 0, borderTopWidth: 1, borderRightWidth: 1 }} />
      <span className="tick" style={i === 0 ? { bottom: 0, right: 0, borderBottomWidth: 1, borderRightWidth: 1 } : { bottom: 0, left: 0, borderBottomWidth: 1, borderLeftWidth: 1 }} />
      <div data-layer="1.4" style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <span className="m" style={{ color: 'var(--muted)' }}>{p.id}</span>
        <span className="m" style={{ color: 'var(--muted)' }}>{p.kind}</span>
      </div>
      <h3 data-layer="1.1" style={{ fontSize: 'clamp(24px,2.6vw,34px)', marginTop: 18 }}>{p.name}</h3>
      <p data-layer="0.7" style={{ fontSize: 16, lineHeight: 1.6, marginTop: 16, textWrap: 'pretty' }}>{p.body}</p>
      <div data-layer="0.9" style={{ borderLeft: '2px solid var(--accent)', paddingLeft: 16, marginTop: 20 }}>
        <div className="m" style={{ color: 'var(--accent)' }}>The decision</div>
        <p style={{ fontSize: 15, lineHeight: 1.6, marginTop: 8, textWrap: 'pretty' }}>
          {p.decisionLead}{p.decisionEm && <em>{p.decisionEm}</em>}{p.decision}
        </p>
      </div>
      <p data-layer="0.4" style={{ fontSize: 15, lineHeight: 1.6, marginTop: 18, color: 'var(--muted)', textWrap: 'pretty' }}>{p.note}</p>
      <Tags items={p.tags} />
      <a href={p.href} target="_blank" rel="noopener noreferrer" className="m" style={{ display: 'inline-block', marginTop: 22, color: 'var(--accent)' }}>Source ↗</a>
    </div>
  );
}

export function Independent() {
  return (
    <section id="independent" className="wrap scene-deep" style={{ position: 'relative', paddingTop: 104, scrollMarginTop: 70, overflow: 'hidden' }}>
      <div className="ghost" aria-hidden="true" style={{ right: '-2vw', top: 140, fontStyle: 'italic', fontSize: 'clamp(110px,18vw,280px)' }}>CURIOSITY</div>
      <div className="rv" style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 34, flexWrap: 'wrap' }}>
        <span className="m" style={{ color: 'var(--muted)', minWidth: 170 }}>04 — Independent</span>
        <h2 style={{ fontSize: 'clamp(30px,4.2vw,62px)' }}>Built on my own <em style={{ fontStyle: 'italic', fontWeight: 400 }}>time</em>.</h2>
        <a href={GITHUB} target="_blank" rel="noopener noreferrer" className="m" style={{ marginLeft: 'auto', color: 'var(--accent)' }}>github.com/varun-kannan ↗</a>
      </div>
      <div className="rv g-3 preserve" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: 46, borderTop: '1px solid var(--fg)' }}>
        {PROJECTS.map((p, i) => <ProjectCard key={p.id} p={p} i={i} />)}
      </div>
    </section>
  );
}

export function Approach() {
  return (
    <section id="approach" className="wrap scene" style={{ position: 'relative', paddingTop: 104, scrollMarginTop: 70, overflow: 'hidden' }}>
      <div className="ghost" aria-hidden="true" style={{ right: '-2vw', top: 130, fontStyle: 'italic', fontSize: 'clamp(120px,19vw,300px)' }}>RESTRAINT</div>
      <div className="rv g-about" style={{ position: 'relative', display: 'grid', gridTemplateColumns: '.14fr .52fr .34fr', gap: 48 }}>
        <div className="m" style={{ color: 'var(--muted)' }}>05 — Approach</div>
        <h2 style={{ fontSize: 'clamp(30px,4.6vw,74px)', letterSpacing: '-.045em' }}>
          A payment that fails cleanly beats one that <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}>hangs</em>.
        </h2>
        <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.66, alignSelf: 'end', textWrap: 'pretty' }}>
          A clear decline costs a merchant a minute. A payment stuck between the card and the bank costs them a week. I build so the second one never happens.
        </p>
      </div>
      <div className="rv live-rule g-cap preserve" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', marginTop: 56, borderTop: '1px solid var(--fg)' }}>
        {APPROACH.map((t, i) => (
          <div key={t} className={`card${i === 0 ? ' halftone' : ''}`} style={{ borderRight: '1px dashed var(--rule)', borderBottom: '1px dashed var(--rule)', padding: '28px 26px 34px' }}>
            <div className="m" data-layer="1.3" style={{ color: i === 0 ? 'var(--accent)' : 'var(--muted)' }}>{String(i + 1).padStart(2, '0')}</div>
            <h3 data-layer="0.8" style={{ fontSize: 20, marginTop: 14, lineHeight: 1.2 }}>{t}</h3>
          </div>
        ))}
      </div>
    </section>
  );
}

const FOOT_COLS = [
  ['Elsewhere', [['GitHub', '/varun-kannan', GITHUB], ['LinkedIn', '/varun-n', LINKEDIN], ['Email', 'direct', `mailto:${EMAIL}`]]],
  ['Projects', [['jobscout', 'cli', `${GITHUB}/jobscout`], ['library', 'rest api', `${GITHUB}/library`]]],
  ['Quick links', [['Work', 'selected', '#work'], ['Capabilities', 'stack', '#capabilities'], ['Résumé', 'on request', RESUME_MAILTO]]],
];

export function Contact() {
  const mailRef = useMagnetic({ strength: 10 });
  return (
    <div id="contact" style={{ marginTop: 120, background: 'var(--inv-bg)', color: 'var(--inv-fg)', scrollMarginTop: 70, position: 'relative', overflow: 'hidden', borderTop: '1px solid var(--seam)' }}>
      <TextureInverted />
      <HalftoneBackdrop />
      <SignatureMark />
      <div className="wrap" style={{ paddingTop: 96, paddingBottom: 40, position: 'relative', zIndex: 1 }}>
        <div className="rv g-foot" style={{ display: 'grid', gridTemplateColumns: '1.1fr .6fr .6fr .6fr', gap: 56 }}>
          <div>
            <div className="m" style={{ color: 'var(--inv-muted)' }}>06 — Contact</div>
            <h2 style={{ fontSize: 'clamp(38px,5.4vw,86px)', letterSpacing: '-.048em', lineHeight: .94, marginTop: 22, fontWeight: 800 }}>
              Building something?<br /><em style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--inv-accent)' }}>Let's discuss.</em>
            </h2>
            <a href={`mailto:${EMAIL}`} ref={mailRef} className="m lift"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 18, marginTop: 30, border: '1px dashed var(--inv-rule)', borderRadius: 100, padding: '13px 18px 13px 24px', color: 'var(--inv-fg)' }}>
              {EMAIL}<span className="pix" aria-hidden="true"><i>→</i><b>→</b></span>
            </a>
          </div>
          {FOOT_COLS.map(([label, links]) => (
            <div key={label}>
              <div className="m" style={{ color: 'var(--inv-muted)', paddingBottom: 10, borderBottom: '1px dashed var(--inv-rule)' }}>{label}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
                {links.map(([name, sub, href]) => (
                  <a key={name} href={href}
                    {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    style={{ fontSize: 16.5, color: 'var(--inv-fg)' }}>
                    {name} <span className="m" style={{ color: 'var(--inv-muted)' }}>{sub}</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="g-foot" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 34, marginTop: 88, paddingTop: 22, borderTop: '1px dashed var(--inv-rule)' }}>
          <div className="m" style={{ color: 'var(--inv-muted)' }}>Chennai, India · UTC+5:30</div>
          <div className="m" style={{ color: 'var(--inv-muted)' }}>Open to work</div>
          <div className="m" style={{ color: 'var(--inv-muted)', textAlign: 'right' }}>© 2026 Varun N</div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ThemeToggle } from '../design-system/components/core/ThemeToggle';
import logoMark from '../assets/logo-mark.svg';

interface LayoutProps {
  children: ReactNode;
}

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      to={to}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        fontFamily: 'var(--font-sans)', fontSize: 'var(--text-ui)', fontWeight: 500,
        color: hover ? 'var(--accent-text)' : 'var(--text-muted)',
        textDecoration: 'none', padding: '6px 10px', borderRadius: 'var(--radius-sm)',
        transition: 'color var(--dur-fast) var(--ease-standard)',
      }}
    >
      {children}
    </Link>
  );
}

function FooterLink({ to, href, children }: { to?: string; href?: string; children: ReactNode }) {
  const [hover, setHover] = useState(false);
  const style = {
    fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)',
    color: hover ? 'var(--accent-text)' : 'var(--text-muted)',
    textDecoration: 'none', transition: 'color var(--dur-fast) var(--ease-standard)',
  };
  const handlers = { onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false) };
  if (to) return <Link to={to} style={style} {...handlers}>{children}</Link>;
  return <a href={href} target="_blank" rel="noopener noreferrer" style={style} {...handlers}>{children}</a>;
}

/**
 * Top-level layout shell — matches the spirit of template.html.
 * Wraps every page with the Acme brand header, skip-to-content link,
 * dark-mode toggle, and an informative footer.
 */
export default function Layout({ children }: LayoutProps) {
  const [brandHover, setBrandHover] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-page)' }}>
      <a href="#main" className="skip-link">Skip to main content</a>

      <header
        style={{
          position: 'sticky', top: 0, zIndex: 200,
          background: 'color-mix(in oklch, var(--surface-card) 88%, transparent)',
          backdropFilter: 'saturate(1.4) blur(10px)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{
          maxWidth: 'var(--width-content)', margin: '0 auto',
          padding: '0 var(--space-6)', height: 'var(--header-height)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Link
            to="/"
            onMouseEnter={() => setBrandHover(true)}
            onMouseLeave={() => setBrandHover(false)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
          >
            <img src={logoMark} alt="" style={{ width: 26, height: 'auto', display: 'block' }} />
            <span style={{
              fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'var(--text-xl)',
              letterSpacing: 'var(--tracking-tight)',
              color: brandHover ? 'var(--accent-text)' : 'var(--text-heading)',
              transition: 'color var(--dur-fast) var(--ease-standard)',
            }}>
              Acme Co.
            </span>
          </Link>
          <nav aria-label="Site navigation" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <NavLink to="/">Home</NavLink>
            <NavLink to="/blog">Blog</NavLink>
            <NavLink to="/about-page">About</NavLink>
            <span style={{ width: 1, height: 22, background: 'var(--border-subtle)', margin: '0 4px' }} />
            <ThemeToggle size="sm" />
          </nav>
        </div>
      </header>

      <main id="main" style={{ maxWidth: 'var(--width-content)', margin: '0 auto', padding: 'var(--space-6)' }}>
        {children}
      </main>

      <footer style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 'var(--space-24)' }}>
        <div style={{ maxWidth: 'var(--width-content)', margin: '0 auto', padding: 'var(--space-12) var(--space-6)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-12)', justifyContent: 'space-between' }}>
            <div style={{ maxWidth: '26rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginBottom: 'var(--space-3)' }}>
                <img src={logoMark} alt="" style={{ width: 22 }} />
                <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'var(--text-lg)', color: 'var(--text-heading)' }}>Acme Co.</span>
              </div>
              <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-relaxed)', color: 'var(--text-muted)' }}>
                A reputable international maker of widgets, valves, and industrial products.
              </p>
            </div>
            <nav aria-label="Footer navigation" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', fontWeight: 500, letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>
                Quick links
              </span>
              <FooterLink to="/">Home</FooterLink>
              <FooterLink to="/blog">Blog</FooterLink>
              <FooterLink to="/jobs">Careers</FooterLink>
              <FooterLink href="https://acme.com">acme.com ↗</FooterLink>
            </nav>
          </div>
          <p style={{ marginTop: 'var(--space-10)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-subtle)' }}>
            © {new Date().getFullYear()} Acme Co. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

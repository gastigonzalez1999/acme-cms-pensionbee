import { useNavigate } from 'react-router-dom';
import { Button } from '../design-system/components/core/Button';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 'var(--space-32) var(--space-6)' }}>
      <p style={{
        margin: 0, fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'var(--text-6xl)',
        lineHeight: 1, color: 'var(--accent-muted)', letterSpacing: '-0.03em', userSelect: 'none',
      }}>
        404
      </p>
      <h1 style={{ margin: 'var(--space-6) 0 0', fontSize: 'var(--text-3xl)', color: 'var(--text-heading)' }}>
        Page not found
      </h1>
      <p style={{
        margin: 'var(--space-3) 0 0', maxWidth: '40ch',
        fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)', lineHeight: 'var(--leading-normal)',
        color: 'var(--text-muted)',
      }}>
        This page doesn't exist. It may have been removed, or the URL might be wrong.
      </p>
      <div style={{ marginTop: 'var(--space-8)' }}>
        <Button variant="primary" icon="arrow-left" onClick={() => navigate('/')}>Back to home</Button>
      </div>
    </div>
  );
}

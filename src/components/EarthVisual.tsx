import { useEffect, useRef, useState, type ComponentType } from 'react';
import './earth.css';

type DesktopProps = { onReady: () => void; onFailure: () => void };

/** Decorative Earth. Small screens never import the Three.js entry point. */
export default function EarthVisual({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const [Desktop, setDesktop] = useState<ComponentType<DesktopProps> | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!('IntersectionObserver' in window) || !('ResizeObserver' in window)) return;
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
    if (mobile) return;
    const screen = matchMedia('(min-width: 900px)');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    let active = true;
    let requested = false;
    const update = () => {
      observer.disconnect();
      if (!screen.matches || motion.matches || connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType || '')) {
        setDesktop(null);
        setReady(false);
        return;
      }
      requested = false;
      observer.observe(container.current!);
    };
    const observer = new IntersectionObserver((entries) => {
      if (!screen.matches || motion.matches || !entries.some(entry => entry.isIntersecting) || requested) return;
      requested = true;
      import('./DesktopEarth').then(module => {
        if (active && screen.matches && !motion.matches) setDesktop(() => module.default);
      }).catch(() => { /* The static visual remains visible. */ });
    }, { rootMargin: '100px' });
    update();
    screen.addEventListener('change', update);
    motion.addEventListener('change', update);
    return () => { active = false; observer.disconnect(); screen.removeEventListener('change', update); motion.removeEventListener('change', update); };
  }, []);

  return <div ref={container} className={`earth-visual ${compact ? 'earth-visual--compact' : ''} ${ready ? 'earth-visual--ready' : ''} ${className}`} aria-hidden="true">
    <div className="earth-ambient" />
    <picture className="earth-static">
      <source media="(max-width: 899px)" srcSet="/earth/earth-mobile.webp" />
      <img src="/earth/earth-static.webp" width="1080" height="1080" alt="" decoding="async" fetchPriority={compact ? 'low' : 'high'} />
    </picture>
    {Desktop && <Desktop onReady={() => setReady(true)} onFailure={() => { setReady(false); setDesktop(null); }} />}
  </div>;
}

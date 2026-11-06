import { useEffect, useRef, useState, type ComponentType } from 'react';
import { canAnimateEarth } from './earthRuntime';
import './earth.css';

type DesktopProps = { onReady: () => void; onFailure: () => void };

/** Adaptive animated Earth on every screen; accessibility and API checks precede the lazy import. */
export default function EarthVisual({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const [Desktop, setDesktop] = useState<ComponentType<DesktopProps> | null>(null);
  const [ready, setReady] = useState(false);
  const failure = useRef(() => {});

  useEffect(() => {
    if (typeof matchMedia !== 'function' || typeof IntersectionObserver !== 'function' || typeof ResizeObserver !== 'function') return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const eligible = () => canAnimateEarth({
      reducedMotion: motion.matches,
      // Three r180 requires WebGL2. This API check does not allocate a throwaway context.
      webgl2: typeof window.WebGL2RenderingContext === 'function', observers: true,
    });
    let active = true;
    let near = false;
    let mounted = false;
    let failed = false;
    let wasEligible = false;
    let loaded: ComponentType<DesktopProps> | null = null;
    let loading: Promise<void> | null = null;
    const mountIfAllowed = () => {
      if (active && near && eligible() && loaded && !failed && !mounted) {
        mounted = true;
        setDesktop(() => loaded);
      }
    };
    const observer = new IntersectionObserver(entries => {
      near = entries.some(entry => entry.isIntersecting);
      if (!near || !eligible() || failed) return;
      if (loaded) mountIfAllowed();
      else if (!loading) loading = import('./DesktopEarth').then(module => {
        loaded = module.default;
        mountIfAllowed();
      }).catch(() => { failed = true; loading = null; /* Keep the static globe visible. */ });
    }, { rootMargin: '100px' });
    failure.current = () => {
      if (!active) return;
      failed = true;
      mounted = false;
      setReady(false);
      setDesktop(null);
    };
    const update = () => {
      observer.disconnect();
      near = false;
      const allowed = eligible();
      if (allowed && !wasEligible) failed = false;
      wasEligible = allowed;
      if (!allowed) {
        mounted = false;
        setDesktop(null);
        setReady(false);
      } else observer.observe(container.current!);
    };
    update();
    motion.addEventListener('change', update);
    return () => {
      active = false;
      failure.current = () => {};
      observer.disconnect();
      motion.removeEventListener('change', update);
    };
  }, []);

  return <div ref={container} className={`earth-visual ${compact ? 'earth-visual--compact' : ''} ${ready ? 'earth-visual--ready' : ''} ${className}`} aria-hidden="true">
    <div className="earth-ambient" />
    <picture className="earth-static">
      <source media="(max-width: 1023px)" srcSet="/earth/earth-mobile.webp" />
      <img src="/earth/earth-static.webp" width="1080" height="1080" alt="" decoding="async" fetchPriority={compact ? 'low' : 'high'} />
    </picture>
    {Desktop && <Desktop onReady={() => setReady(true)} onFailure={() => failure.current()} />}
  </div>;
}

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { BarChart3, Check, Code2, Cpu, Image, Layers3, Megaphone, Play, Settings, Users } from 'lucide-react';
import './digital-ecosystem.css';

const cards = [
  { kind: 'marketing', title: 'Marketing', Icon: Megaphone, items: ['Estratégias', 'Conteúdo', 'Audiência'] },
  { kind: 'technology', title: 'Tecnologia', Icon: Code2, items: ['Automação', 'Integrações', 'Produtividade'] },
  { kind: 'tools', title: 'Ferramentas', Icon: Layers3, items: ['Recursos digitais', 'Apps e plataformas', 'Soluções digitais'] },
] as const;

/** A CSS 3D scene with real HTML labels, SVG orbits and one small rendered core. */
export default function DigitalEcosystem() {
  const [reduced, setReduced] = useState(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(false);
  const [hidden, setHidden] = useState(() => document.hidden);
  const stage = useRef<HTMLDivElement>(null);
  const bounds = useRef<DOMRect | null>(null);
  const media = useRef<{ fine: MediaQueryList; wide: MediaQueryList } | null>(null);
  const running = !reduced && visible && !hidden;
  const active = useRef(running);
  active.current = running;

  const resetPointer = () => {
    bounds.current = null;
    const style = stage.current?.style;
    style?.setProperty('--pointer-x', '0px');
    style?.setProperty('--pointer-y', '0px');
    style?.setProperty('--pointer-rotate-x', '0deg');
    style?.setProperty('--pointer-rotate-y', '0deg');
  };
  useEffect(() => {
    const element = stage.current!;
    let observer: IntersectionObserver | undefined;
    let motion: MediaQueryList | undefined;
    const syncViewport = () => {
      if (!observer) { setVisible(true); return; }
      const rect = element.getBoundingClientRect();
      const width = window.innerWidth || document.documentElement.clientWidth;
      const height = window.innerHeight || document.documentElement.clientHeight;
      setVisible(rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < height && rect.left < width);
    };
    const refresh = () => {
      setHidden(document.hidden);
      if (motion) setReduced(motion.matches);
      resetPointer();
      syncViewport();
    };
    const leavePage = () => { setHidden(true); resetPointer(); };
    if (typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver(entries => setVisible(entries.some(entry => entry.isIntersecting)));
      observer.observe(element);
    }
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('resize', refresh, { passive: true });
    window.addEventListener('pageshow', refresh);
    window.addEventListener('pagehide', leavePage);
    const listeners: Array<[MediaQueryList, () => void]> = [];
    if (typeof matchMedia === 'function') {
      motion = matchMedia('(prefers-reduced-motion: reduce)');
      const fine = matchMedia('(pointer: fine) and (hover: hover)');
      const wide = matchMedia('(min-width: 1024px)');
      media.current = { fine, wide };
      const motionChanged = () => { setReduced(motion!.matches); resetPointer(); };
      listeners.push([motion, motionChanged], [fine, resetPointer], [wide, resetPointer]);
      listeners.forEach(([query, listener]) => query.addEventListener('change', listener));
    }
    // Start an already visible hero immediately, even before the observer's first
    // callback; also resync the tab state that may have changed during loading.
    refresh();
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('resize', refresh);
      window.removeEventListener('pageshow', refresh);
      window.removeEventListener('pagehide', leavePage);
      listeners.forEach(([query, listener]) => query.removeEventListener('change', listener));
      media.current = null;
    };
  }, []);
  useEffect(() => { if (!running) resetPointer(); }, [running]);
  const pointerAllowed = () => active.current && Boolean(media.current?.fine.matches && media.current?.wide.matches);
  const enter = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && pointerAllowed()) bounds.current = stage.current!.getBoundingClientRect();
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || !pointerAllowed()) return;
    const rect = bounds.current;
    if (!rect?.width || !rect.height) return;
    const x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
    const style = stage.current!.style;
    // CSS transitions damp these values; no RAF, layout reads or React state per move.
    style.setProperty('--pointer-x', `${(x * 7).toFixed(2)}px`);
    style.setProperty('--pointer-y', `${(y * 5).toFixed(2)}px`);
    style.setProperty('--pointer-rotate-x', `${(-y * 2).toFixed(2)}deg`);
    style.setProperty('--pointer-rotate-y', `${(x * 2.5).toFixed(2)}deg`);
  };
  return <figure className="digital-ecosystem" data-motion={reduced ? 'static' : 'animated'} data-active={String(running)} aria-label="Ecossistema digital ilustrativo">
    <div ref={stage} className="ecosystem-stage" onPointerEnter={enter} onPointerMove={move} onPointerLeave={resetPointer} onPointerCancel={resetPointer}>
      <div className="ecosystem-scene">
        <div className="ecosystem-floor-glow" aria-hidden="true" />
        <div className="ecosystem-platform" aria-hidden="true" />
        <svg className="ecosystem-orbits" viewBox="0 0 640 560" fill="none" aria-hidden="true">
          <defs><linearGradient id="ecosystem-orbit-color" x1="30" y1="400" x2="600" y2="130" gradientUnits="userSpaceOnUse"><stop stopColor="#8b61ee" stopOpacity=".25"/><stop offset=".4" stopColor="#adbdfb"/><stop offset=".75" stopColor="#9062e9"/><stop offset="1" stopColor="#cdadf5" stopOpacity=".35"/></linearGradient></defs>
          <g stroke="url(#ecosystem-orbit-color)" strokeWidth="1.5"><ellipse cx="320" cy="290" rx="294" ry="108" transform="rotate(-15 320 290)"/><ellipse cx="320" cy="290" rx="248" ry="132" transform="rotate(25 320 290)"/><ellipse cx="320" cy="290" rx="226" ry="115" transform="rotate(-48 320 290)"/></g>
          <g className="ecosystem-nodes" fill="#b69af4" stroke="#f6f1ff" strokeWidth="2"><circle cx="124" cy="364" r="5"/><circle cx="303" cy="153" r="6"/><circle cx="563" cy="301" r="5"/><circle cx="403" cy="394" r="4"/></g>
        </svg>
        <div className="ecosystem-core" aria-hidden="true"><picture><source media="(max-width: 767px)" srcSet="/images/heroes/digital-core-mobile.webp"/><img src="/images/heroes/digital-core.webp" width="900" height="900" alt="" decoding="async" fetchPriority="high"/></picture></div>
        {cards.map(({ kind, title, Icon, items }) => <div key={kind} className={`ecosystem-card-anchor card-${kind}`}><article className="ecosystem-card" aria-label={`Categoria ilustrativa: ${title}`}>
          <div className="ecosystem-card-heading"><span className="card-icon"><Icon size={19} aria-hidden="true"/></span><h3>{title}</h3><span className="card-dots" aria-hidden="true">•••</span></div>
          <ul>{items.map(item => <li key={item}><Check size={13} aria-hidden="true"/>{item}</li>)}</ul>
          <div className="ecosystem-card-symbol" aria-hidden="true">{kind === 'marketing' ? <span className="ecosystem-bars"><span/><span/><span/><span/></span> : kind === 'technology' ? <Cpu/> : <Layers3/>}</div>
        </article></div>)}
        {[['play', Play], ['chart', BarChart3], ['image', Image], ['users', Users], ['settings', Settings]].map(([name, Icon]) => {
          const TileIcon = Icon as typeof Play;
          return <span key={name as string} className={`ecosystem-tile tile-${name}`} aria-hidden="true"><TileIcon/></span>;
        })}
      </div>
    </div>
    <figcaption className="ecosystem-caption">Seu próximo passo é digital</figcaption>
  </figure>;
}

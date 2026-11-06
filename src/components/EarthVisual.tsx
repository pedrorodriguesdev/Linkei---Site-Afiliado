import { useEffect, useRef, useState, type ComponentType, type RefObject } from 'react';
import { Play, Pause, RotateCw } from 'lucide-react';
import { canAnimateEarth } from './earthRuntime';
import './earth.css';

type EarthStatus = 'loading' | 'running' | 'paused' | 'reduced-motion' | 'unsupported' | 'initialization' | 'texture' | 'shader' | 'context' | 'performance' | 'frame';
type RendererProps = { onReady: () => void; onFailure: (reason?: string) => void };
const explanations: Record<EarthStatus, string> = {
  loading: 'Preparando a animação…', running: 'Rotação ativada', paused: 'Rotação pausada por você.',
  'reduced-motion': 'A animação foi pausada porque “reduzir movimento” está ativado no sistema ou navegador.',
  unsupported: 'O navegador não disponibilizou os recursos necessários para iniciar a animação.',
  initialization: 'O navegador não conseguiu iniciar a visualização 3D.',
  texture: 'Uma das texturas da Terra não carregou.', shader: 'O navegador não conseguiu preparar os efeitos da Terra.',
  context: 'O navegador interrompeu a visualização 3D.', performance: 'A animação foi pausada para manter a página responsiva.',
  frame: 'A visualização 3D foi interrompida antes de completar um quadro.',
};

function EarthDiagnostics({ container, status }: { container: RefObject<HTMLDivElement | null>; status: EarthStatus }) {
  const [report, setReport] = useState('');
  useEffect(() => {
    const update = () => {
      const host = container.current?.querySelector<HTMLElement>('.earth-canvas');
      const bounds = host?.getBoundingClientRect();
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      setReport([
        `Movimento reduzido no navegador: ${reduced ? 'sim' : 'não'}`,
        `API WebGL2: ${typeof window.WebGL2RenderingContext === 'function' ? 'presente' : 'ausente'}`,
        `Renderer: ${host?.dataset.earthState || 'não montado'}`,
        `Canvas: ${bounds ? `${Math.round(bounds.width)} × ${Math.round(bounds.height)}` : 'ausente'}`,
        `Quadros desenhados: ${host?.dataset.earthFrames || '0'}`,
        `Ângulo: ${host?.dataset.earthAngle || 'indisponível'}`,
      ].join('\n'));
    };
    update();
    // This timer only updates the opt-in diagnostic panel; it never drives rotation.
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [container, status]);
  return <aside className="earth-diagnostics" aria-label="Diagnóstico da animação"><strong>Diagnóstico do globo</strong><pre>{`Estado: ${status}\n${explanations[status]}\n${report}`}</pre></aside>;
}

/** Adaptive Earth with an explicit user motion choice and observable fallbacks. */
export default function EarthVisual({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const [Renderer, setRenderer] = useState<ComponentType<RendererProps> | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<EarthStatus>('loading');
  const [choice, setChoice] = useState<'auto' | 'play' | 'pause'>('auto');
  const [attempt, setAttempt] = useState(0);
  const failure = useRef<(reason?: string) => void>(() => {});
  const debug = typeof location !== 'undefined' && new URLSearchParams(location.search).get('globeDebug') === '1';

  useEffect(() => {
    setReady(false);
    setRenderer(null);
    if (typeof matchMedia !== 'function' || typeof IntersectionObserver !== 'function' || typeof ResizeObserver !== 'function') {
      setStatus('unsupported'); return;
    }
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const eligible = () => choice !== 'pause' && canAnimateEarth({
      reducedMotion: motion.matches && choice !== 'play',
      // Explicit play can retry the renderer even when the constructor probe is unavailable.
      webgl2: choice === 'play' || typeof window.WebGL2RenderingContext === 'function', observers: true,
    });
    let active = true, near = false, mounted = false, failed = false, wasEligible = false;
    let loaded: ComponentType<RendererProps> | null = null;
    let loading: Promise<void> | null = null;
    const mountIfAllowed = () => {
      if (active && near && eligible() && loaded && !failed && !mounted) {
        mounted = true; setRenderer(() => loaded);
      }
    };
    const observer = new IntersectionObserver(entries => {
      near = entries.some(entry => entry.isIntersecting);
      if (!near || !eligible() || failed) return;
      if (loaded) mountIfAllowed();
      else if (!loading) loading = import('./DesktopEarth').then(module => {
        loaded = module.default; mountIfAllowed();
      }).catch(() => { failed = true; loading = null; if (active) setStatus('initialization'); });
    }, { rootMargin: '100px' });
    failure.current = reason => {
      if (!active) return;
      failed = true; mounted = false;
      setReady(false); setRenderer(null);
      setStatus(reason && reason in explanations ? reason as EarthStatus : 'initialization');
    };
    const update = () => {
      observer.disconnect(); near = false;
      const allowed = eligible();
      if (allowed && !wasEligible) failed = false;
      wasEligible = allowed;
      if (!allowed) {
        mounted = false; setRenderer(null); setReady(false);
        setStatus(choice === 'pause' ? 'paused' : motion.matches && choice !== 'play' ? 'reduced-motion' : 'unsupported');
      } else { setStatus('loading'); observer.observe(container.current!); }
    };
    update();
    const onPreferenceChange = () => {
      // A new OS preference wins over a previous manual choice.
      if (choice !== 'auto') setChoice('auto'); else update();
    };
    motion.addEventListener('change', onPreferenceChange);
    return () => {
      active = false; failure.current = () => {}; observer.disconnect();
      motion.removeEventListener('change', onPreferenceChange);
    };
  }, [choice, attempt]);

  const toggle = () => {
    if (ready) setChoice('pause');
    else { setChoice('play'); setAttempt(value => value + 1); }
  };
  return <div ref={container} className={`earth-visual ${compact ? 'earth-visual--compact' : ''} ${ready ? 'earth-visual--ready' : ''} ${className}`} data-earth-status={status} role="group" aria-label="Visualização da Terra">
    <div className="earth-ambient" aria-hidden="true" />
    <picture className="earth-static" aria-hidden="true">
      <source media="(max-width: 1023px)" srcSet="/earth/earth-mobile.webp" />
      <img src="/earth/earth-static.webp" width="1080" height="1080" alt="" decoding="async" fetchPriority={compact ? 'low' : 'high'} />
    </picture>
    {Renderer && <Renderer onReady={() => { setReady(true); setStatus('running'); }} onFailure={reason => failure.current(reason)} />}
    <div className="earth-controls">
      <button type="button" className="earth-motion-button" onClick={toggle} aria-pressed={ready} title={explanations[status]}>
        {ready ? <Pause size={13} /> : status === 'loading' ? <RotateCw size={13} /> : <Play size={13} />}
        {ready ? 'Pausar rotação' : status === 'loading' ? 'Iniciar rotação' : 'Ativar rotação'}
      </button>
      {status !== 'running' && status !== 'loading' && <p className="earth-motion-message" role="status">{explanations[status]}</p>}
    </div>
    {debug && <EarthDiagnostics container={container} status={status} />}
  </div>;
}

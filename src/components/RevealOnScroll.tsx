import { useEffect, useRef, type CSSProperties, type ElementType, type HTMLAttributes } from 'react';
import './reveal.css';

type Variant = 'fade-up' | 'fade-in' | 'slide-left' | 'slide-right' | 'card';
type Props = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  variant?: Variant;
  delay?: number;
  duration?: number;
  threshold?: number;
  rootMargin?: string;
  disabled?: boolean;
  mobileDelay?: number;
};
type RevealEntry = (entry: IntersectionObserverEntry) => void;
const pools = new Map<string, { observer: IntersectionObserver; entries: Map<Element, RevealEntry> }>();

function observe(element: Element, callback: RevealEntry, threshold: number, rootMargin: string) {
  const key = `${threshold}:${rootMargin}`;
  let pool = pools.get(key);
  if (!pool) {
    const entries = new Map<Element, RevealEntry>();
    const observer = new IntersectionObserver(items => {
      for (const item of items) entries.get(item.target)?.(item);
    }, { threshold, rootMargin });
    pool = { observer, entries };
    pools.set(key, pool);
  }
  pool.entries.set(element, callback);
  pool.observer.observe(element);
  return () => {
    pool.entries.delete(element);
    pool.observer.unobserve(element);
    if (pool.entries.size === 0) { pool.observer.disconnect(); pools.delete(key); }
  };
}

/** Visible HTML first. Only offscreen content is armed; motion never gates interaction. */
export default function RevealOnScroll({
  as: Tag = 'div', variant = 'fade-up', delay = 0, duration = 550,
  mobileDelay, threshold = 0.1, rootMargin = '0px 0px 64px 0px', disabled = false,
  style, children, ...attributes
}: Props) {
  const element = useRef<HTMLElement>(null);
  const completed = useRef(false);

  useEffect(() => {
    const node = element.current;
    if (!node) return;
    let unobserve = () => {};
    let stopped = false;
    const motion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
    const show = () => {
      completed.current = true;
      node.dataset.revealState = 'visible';
      unobserve();
    };
    const enter = () => {
      if (stopped || completed.current) return;
      if (motion?.matches || document.hidden) { show(); return; }
      node.dataset.revealState = 'entering';
      completed.current = true;
      unobserve();
    };
    const finish = (event: AnimationEvent) => { if (event.target === node) show(); };
    const onPreference = () => { if (motion?.matches) show(); };
    const onFocus = () => show();
    node.addEventListener('animationend', finish);
    node.addEventListener('focusin', onFocus);
    motion?.addEventListener('change', onPreference);

    if (completed.current || disabled || motion?.matches || !('IntersectionObserver' in window)) {
      show();
    } else {
      const bounds = node.getBoundingClientRect();
      // Zero-size, unlaid-out and restored-above-viewport content stays readable.
      if (bounds.height <= 0 || bounds.bottom <= 0) show();
      else if (bounds.top < window.innerHeight + 24) enter();
      else {
        node.dataset.revealState = 'pending';
        try {
          unobserve = observe(node, entry => {
            if (entry.isIntersecting) enter();
          }, Math.max(0, Math.min(threshold, 1)), rootMargin);
        } catch { show(); }
      }
    }
    return () => {
      stopped = true;
      unobserve();
      node.removeEventListener('animationend', finish);
      node.removeEventListener('focusin', onFocus);
      motion?.removeEventListener('change', onPreference);
      // StrictMode's setup/cleanup cycle must not preserve a hidden node.
      if (!completed.current) node.dataset.revealState = 'visible';
    };
  }, [disabled, threshold, rootMargin]);

  const timing = {
    '--reveal-delay': `${Math.max(0, Math.min(delay, 350))}ms`,
    '--reveal-delay-mobile': `${Math.max(0, Math.min(mobileDelay ?? delay * 0.7, 150))}ms`,
    '--reveal-duration': `${Math.max(200, Math.min(duration, 700))}ms`,
    ...style,
  } as CSSProperties;
  return <Tag ref={element} data-reveal="" data-reveal-variant={variant} style={timing} {...attributes}>{children}</Tag>;
}

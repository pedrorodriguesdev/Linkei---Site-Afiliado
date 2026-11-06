import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import './section-navigation.css';

export type SectionNavigationItem = {
  id: string;
  label: string;
  icon?: ReactNode;
};

type SectionNavigationProps = {
  items: readonly SectionNavigationItem[];
  label?: string;
  className?: string;
};

/** Tracks native document scrolling at the lower edge of the sticky navigation. */
export default function SectionNavigation({
  items,
  label = 'Seções da página',
  className = '',
}: SectionNavigationProps) {
  const { pathname } = useLocation();
  const navigation = useRef<HTMLElement>(null);
  const [activeId, setActiveId] = useState(items[0]?.id ?? '');
  const sectionIds = items.map(({ id }) => id).join('|');

  useEffect(() => {
    const ids = sectionIds.split('|').filter(Boolean);
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);
    setActiveId(ids[0] ?? '');
    if (!sections.length || !('IntersectionObserver' in window)) return;

    const header = document.querySelector<HTMLElement>('.site-header');
    let observer: IntersectionObserver | undefined;
    let frame = 0;
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      observer?.disconnect();
      const headerHeight = header?.getBoundingClientRect().height ?? 0;
      const navigationHeight = navigation.current?.getBoundingClientRect().height ?? 0;
      const rootScrollPadding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const sectionScrollMargin = parseFloat(getComputedStyle(sections[0]).scrollMarginTop) || 0;
      const boundary = Math.min(Math.round(Math.max(headerHeight + navigationHeight + 16, rootScrollPadding + sectionScrollMargin)), window.innerHeight - 2);

      const updateActiveSection = () => {
        // This small measurement runs only on intersection crossings, never per scroll frame.
        let currentId = sections[0].id;
        for (const section of sections) {
          if (section.getBoundingClientRect().top <= boundary + 2) currentId = section.id;
          else break;
        }
        setActiveId((previous) => previous === currentId ? previous : currentId);
      };

      observer = new IntersectionObserver(updateActiveSection, {
        rootMargin: `-${boundary}px 0px -${Math.max(0, window.innerHeight - boundary - 2)}px 0px`,
        threshold: 0,
      });
      sections.forEach((section) => observer?.observe(section));
      updateActiveSection();
    };

    const scheduleConnect = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(connect);
    };
    const sizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(scheduleConnect);
    if (navigation.current) sizeObserver?.observe(navigation.current);
    if (header) sizeObserver?.observe(header);
    window.addEventListener('resize', scheduleConnect, { passive: true });
    scheduleConnect();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      sizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleConnect);
    };
  }, [pathname, sectionIds]);

  return (
    <nav ref={navigation} className={`detail-tabs section-navigation ${className}`.trim()} aria-label={label}>
      {items.map(({ id, label: itemLabel, icon }) => (
        <a key={id} href={`#${id}`} className={activeId === id ? 'is-active' : undefined} aria-current={activeId === id ? 'location' : undefined}>
          {icon && <span className="section-navigation-icon" aria-hidden="true">{icon}</span>}
          {itemLabel}
        </a>
      ))}
    </nav>
  );
}

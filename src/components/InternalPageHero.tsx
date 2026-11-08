import type { ReactNode } from 'react';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import './internal-page-hero.css';

type Props = {
  eyebrow: string;
  Icon: LucideIcon;
  title: ReactNode;
  description: string;
  illustration: 'about' | 'normas' | 'redes';
  action?: { label: string; href: string };
};

/** Decorative artwork is shared by both themes; content and links remain HTML. */
export default function InternalPageHero({ eyebrow, Icon, title, description, illustration, action }: Props) {
  const asset = `/images/heroes/elevon-${illustration}`;
  return <section className={`page-hero internal-page-hero internal-page-hero--${illustration}`}>
    <div className="hero-copy">
      <span className="eyebrow"><Icon size={15} aria-hidden="true" />{eyebrow}</span>
      <h1>{title}</h1>
      <p className="page-intro">{description}</p>
      {action && <a className="button button-primary internal-hero-action" href={action.href}>{action.label}<ArrowRight size={18} aria-hidden="true" /></a>}
    </div>
    <div className="internal-page-art" aria-hidden="true">
      <picture>
        <source media="(max-width: 767px)" srcSet={`${asset}-mobile.webp`} />
        <img src={`${asset}.webp`} width="1200" height="800" alt="" decoding="async" fetchPriority="high" />
      </picture>
    </div>
  </section>;
}

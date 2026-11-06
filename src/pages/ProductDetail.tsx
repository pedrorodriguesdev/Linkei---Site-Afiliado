import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown,
  CircleHelp, Compass, ExternalLink, GraduationCap, Layers3,
  Lightbulb, ListChecks, Search, ShieldCheck, ShoppingBag, Users, Wrench,
} from 'lucide-react';
import { products } from '../data/products';
import RevealOnScroll from '../components/RevealOnScroll';
import SectionNavigation from '../components/SectionNavigation';

const applications: Record<string, string[]> = {
  'seja-seu-chefe': [
    'Explorar habilidades para projetos digitais',
    'Avaliar possibilidades em design e criação audiovisual',
    'Conhecer usos de inteligência artificial na criação',
  ],
  'metodo-tiktok-shop': [
    'Planejar conteúdo relacionado a produtos',
    'Entender possibilidades de comercialização no TikTok Shop',
    'Avaliar como o canal se encaixa em um projeto digital',
  ],
  'ia-academy': [
    'Explorar o uso de IA na criação de conteúdo',
    'Avaliar novas possibilidades para projetos criativos',
    'Relacionar ferramentas de IA aos seus objetivos',
  ],
  'primeira-venda-24h': [
    'Conhecer possibilidades de negócios digitais',
    'Explorar ideias relacionadas a Micro SaaS',
    'Avaliar aplicações de inteligência artificial',
  ],
  'edicao-dinamica-capcut': [
    'Desenvolver habilidades de edição de vídeo',
    'Explorar o CapCut em projetos audiovisuais',
    'Avaliar o treinamento para seus objetivos de criação',
  ],
  'livego-pro': [
    'Avaliar uma ferramenta para transmissões comerciais',
    'Explorar possibilidades de organização de lives',
    'Relacionar a operação de lives ao TikTok Shop',
  ],
};

const sectionNavigation = [
  { id: 'visao-geral', label: 'Visão geral', icon: <Compass size={18} /> },
  { id: 'como-funciona', label: 'Como funciona', icon: <ArrowRight size={18} /> },
  { id: 'temas', label: 'O que você encontrará', icon: <Layers3 size={18} /> },
  { id: 'para-quem', label: 'Para quem é', icon: <Users size={18} /> },
  { id: 'perguntas', label: 'Perguntas frequentes', icon: <CircleHelp size={18} /> },
];

const process = [
  { number: '01', Icon: Search, title: 'Explore', description: 'Conheça os detalhes da oferta.' },
  { number: '02', Icon: ExternalLink, title: 'Acesse', description: 'Visite a página oficial do produtor.' },
  { number: '03', Icon: ListChecks, title: 'Decida', description: 'Confira as condições antes de finalizar uma compra na plataforma externa.' },
];

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const product = products.find((item) => item.slug === slug);

  useEffect(() => {
    document.title = product ? `${product.name} — Elevon` : 'Produto não encontrado — Elevon';
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) description.content = product?.description ?? 'Explore as ofertas de produtos digitais da Elevon.';
  }, [product]);

  if (!product) {
    return (
      <div className="page-shell not-found">
        <span className="eyebrow"><Compass size={16} /> CATÁLOGO ELEVON</span>
        <h1>Esta oferta não foi encontrada.</h1>
        <p>Explore o catálogo para conhecer os produtos disponíveis.</p>
        <Link className="button button-primary" to="/produtos"><ArrowLeft size={18} /> Voltar ao catálogo</Link>
      </div>
    );
  }

  const isTool = product.category === 'Ferramenta digital';
  const CategoryIcon = isTool ? Wrench : GraduationCap;
  const hasSeparateCheckout = product.offerUrl !== product.purchaseUrl;
  const isCheckoutOnly = product.slug === 'edicao-dinamica-capcut';
  const externalLinkProps = { target: '_blank', rel: 'sponsored noopener noreferrer' };

  return (
    <div className="page-shell product-detail-page" key={product.slug}>
      <nav className="breadcrumb" aria-label="Caminho de navegação">
        <Link to="/produtos">Produtos digitais</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <section className="detail-hero" aria-labelledby="product-title">
        <div className="product-media detail-media" aria-hidden={product.image ? undefined : true}>
          {product.image && <img src={product.image} alt={`Imagem de ${product.name}`} width="480" height="600" style={{ objectFit: 'contain' }} />}
        </div>

        <div className="detail-copy">
          <span className="eyebrow"><CategoryIcon size={16} /> {product.category}</span>
          <h1 id="product-title">{product.name}</h1>
          <p className="page-intro">{product.description}</p>
          {product.note && <p className="product-note"><CircleHelp size={17} /> {product.note}</p>}
          <div className="action-row">
            <a className="button button-primary" href={product.offerUrl} {...externalLinkProps}>
              Conhecer a oferta <ArrowUpRight size={19} />
            </a>
            {hasSeparateCheckout && (
              <a className="button button-secondary" href={product.purchaseUrl} {...externalLinkProps}>
                <ShoppingBag size={18} /> Ir para compra
              </a>
            )}
          </div>
          <p className="external-note"><ExternalLink size={14} /> {isCheckoutOnly ? 'Você será direcionado ao checkout externo do produtor.' : 'Você será direcionado à plataforma externa do produtor.'}</p>
          <p className="affiliate-note">Link de afiliado. A Elevon pode receber uma comissão por compras realizadas por este link.</p>
        </div>

        <RevealOnScroll as="aside" variant="fade-in" className="panel detail-facts" aria-label="Informações da oferta">
          <h2><ShieldCheck size={23} /> Antes de continuar</h2>
          <ul>
            <li><CategoryIcon size={24} /><div><strong>{isTool ? 'Ferramenta digital' : 'Oferta educacional'}</strong><span>{isTool ? 'Avalie as funcionalidades na página do produtor.' : 'Confira o conteúdo e o formato na página do produtor.'}</span></div></li>
            <li><ExternalLink size={24} /><div><strong>Compra na plataforma externa</strong><span>Condições e pagamento são apresentados pelo vendedor.</span></div></li>
            <li><CircleHelp size={24} /><div><strong>Informações do produtor</strong><span>Preço, acesso, suporte e políticas devem ser conferidos antes da compra.</span></div></li>
          </ul>
          <Link className="text-link" to="/normas">Entenda nossa transparência <ArrowRight size={16} /></Link>
        </RevealOnScroll>
      </section>

      <SectionNavigation items={sectionNavigation} label="Seções do produto" />

      <div className="detail-body">
        <div className="detail-main">
          <RevealOnScroll as="section" variant="fade-up" className="panel detail-section" id="visao-geral" aria-labelledby="overview-title">
            <span className="section-kicker">UM OLHAR SOBRE A OFERTA</span>
            <h2 id="overview-title">Seu próximo passo começa com informação.</h2>
            <p>{product.description}</p>
            <p>Use esta página como ponto de partida. Na plataforma externa, confira {isTool ? 'os recursos, os requisitos de uso' : 'o conteúdo, o formato do treinamento'}, o preço e as condições atualizadas para decidir se a oferta faz sentido para você.</p>
          </RevealOnScroll>

          <RevealOnScroll as="section" variant="fade-in" className="panel detail-section" id="como-funciona" aria-labelledby="process-title">
            <div className="section-heading"><div><span className="section-kicker">DO CATÁLOGO À SUA DECISÃO</span><h2 id="process-title">Como funciona</h2><p>Um caminho simples para conhecer a oferta e avaliar os detalhes.</p></div></div>
            <div className="steps-grid">
              {process.map(({ number, Icon, title, description }, index) => (
                <RevealOnScroll as="article" variant="card" delay={index * 55} className="step-card" key={number}>
                  <span className="step-number">{number}</span>
                  <Icon size={26} aria-hidden="true" />
                  <h3>{title}</h3><p>{description}</p>
                </RevealOnScroll>
              ))}
            </div>
          </RevealOnScroll>

          <RevealOnScroll as="section" variant="fade-in" className="panel detail-section" id="temas" aria-labelledby="topics-title">
            <div className="section-heading"><div><span className="section-kicker">TEMAS RELACIONADOS</span><h2 id="topics-title">O que você encontrará</h2><p>Os temas abaixo se relacionam à descrição desta oferta. Consulte o produtor para conhecer {isTool ? 'as funcionalidades disponíveis' : 'o conteúdo completo'}.</p></div></div>
            <div className="topic-grid">
              {product.topics.map((topic, index) => <RevealOnScroll variant="card" delay={index * 55} className="topic-card" key={topic}><Layers3 size={23} aria-hidden="true" /><h3>{topic}</h3></RevealOnScroll>)}
            </div>
          </RevealOnScroll>

          <RevealOnScroll as="section" variant="fade-up" className="panel detail-section" id="para-quem" aria-labelledby="audience-title">
            <div className="section-heading"><div><span className="section-kicker">ALINHE AOS SEUS OBJETIVOS</span><h2 id="audience-title">Para quem é</h2><p>Esta oferta pode ser relevante se você se identifica com estes interesses.</p></div></div>
            <ul className="check-list">{product.audience.map((audience) => <li key={audience}><Check size={18} aria-hidden="true" /><span>{audience}</span></li>)}</ul>
          </RevealOnScroll>

          <RevealOnScroll as="section" variant="fade-up" className="detail-section" id="perguntas" aria-labelledby="faq-title">
            <div className="section-heading"><div><span className="section-kicker">ANTES DE DECIDIR</span><h2 id="faq-title">Perguntas frequentes</h2></div><CircleHelp size={28} aria-hidden="true" /></div>
            <div className="faq-list">
              <details><summary>Onde a compra é realizada?<ChevronDown size={18} aria-hidden="true" /></summary><p>A compra é concluída na plataforma externa indicada pelo produtor. A Elevon apresenta a oferta e não recebe pagamentos nem processa o checkout.</p></details>
              <details><summary>Como consultar preço, acesso e suporte?<ChevronDown size={18} aria-hidden="true" /></summary><p>Confira essas informações na página externa antes de comprar. O produtor ou vendedor define o preço, a forma de acesso, os requisitos, as garantias, as regras de reembolso e os canais de suporte.</p></details>
              <details><summary>Há uma garantia de resultados?<ChevronDown size={18} aria-hidden="true" /></summary><p>A Elevon não promete resultados. Avalie o conteúdo ou os recursos da oferta de acordo com seu contexto, seus objetivos e as condições apresentadas pelo produtor.{product.slug === 'primeira-venda-24h' ? ' O nome “Primeira Venda em 24H” não representa uma promessa de conseguir uma venda em 24 horas.' : ''}</p></details>
              <details><summary>O que significa link de afiliado?<ChevronDown size={18} aria-hidden="true" /></summary><p>A Elevon pode receber uma comissão quando uma compra é realizada por um de seus links de afiliado. As condições comerciais da oferta são apresentadas na plataforma externa. <Link to="/normas">Leia nossas informações de transparência.</Link></p></details>
              {isCheckoutOnly && <details><summary>Por que o link abre uma página de pagamento?<ChevronDown size={18} aria-hidden="true" /></summary><p>Para esta oferta, foi disponibilizado apenas o endereço do checkout externo. Confira cuidadosamente as informações apresentadas pelo vendedor antes de concluir uma compra.</p></details>}
            </div>
          </RevealOnScroll>
        </div>

        <aside className="detail-sidebar">
          <RevealOnScroll as="section" variant="fade-up" className="panel detail-section" aria-labelledby="applications-title">
            <div className="icon-box"><Lightbulb size={25} /></div>
            <span className="section-kicker">POSSIBILIDADES PARA EXPLORAR</span>
            <h2 id="applications-title">Aplicações possíveis</h2>
            <p>Objetivos que podem ajudar a orientar sua avaliação da oferta.</p>
            <ul className="check-list">{(applications[product.slug] ?? []).map((application) => <li key={application}><Check size={18} aria-hidden="true" /><span>{application}</span></li>)}</ul>
            <p className="external-note">As possibilidades dependem do conteúdo, dos recursos e das condições do produto.</p>
          </RevealOnScroll>
          <RevealOnScroll as="section" variant="fade-up" delay={60} className="panel detail-section transparency-aside">
            <ShieldCheck size={30} aria-hidden="true" />
            <h3>Clareza para escolher.</h3>
            <p>A oferta é de responsabilidade do produtor. Nossa proposta é facilitar a descoberta e indicar o caminho até as informações oficiais.</p>
            <Link className="text-link" to="/normas">Normas e transparência <ArrowUpRight size={17} /></Link>
          </RevealOnScroll>
        </aside>
      </div>

      <RevealOnScroll as="section" variant="fade-up" className="panel final-cta" aria-labelledby="final-cta-title">
        <div><span className="section-kicker">CONTINUE SUA EXPLORAÇÃO</span><h2 id="final-cta-title">Faz sentido para o seu momento?</h2><p>Confira os detalhes e as condições diretamente na plataforma do produtor.</p></div>
        <a className="button button-primary" href={product.offerUrl} {...externalLinkProps}>Conhecer a oferta <ArrowUpRight size={19} /></a>
      </RevealOnScroll>
      <Link className="text-link back-to-catalog" to="/produtos"><ArrowLeft size={17} /> Explorar todos os produtos</Link>
    </div>
  );
}

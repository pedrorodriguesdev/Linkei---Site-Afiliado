import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Check, Compass, ExternalLink, Eye, Globe2, Instagram, Layers3, Link2, MousePointer2, Music2, Search, Share2, ShieldCheck, Sparkles, Workflow } from 'lucide-react';
import InternalPageHero from '../components/InternalPageHero';
import RevealOnScroll from '../components/RevealOnScroll';

const socialLinks = [
  { name: 'Instagram', handle: '@elevon.n', url: 'https://www.instagram.com/elevon.n/', description: 'Conteúdos, referências e novidades para acompanhar a Elevon mais de perto.', label: 'Conteúdos e ideias', Icon: Instagram },
  { name: 'TikTok', handle: '@llooping0', url: 'https://www.tiktok.com/@llooping0', description: 'Vídeos e novos pontos de vista sobre criação e possibilidades no digital.', label: 'Vídeos e descobertas', Icon: Music2 },
  { name: 'X', handle: '@LinkouDigital', url: 'https://x.com/LinkouDigital', description: 'Acompanhe publicações e conecte-se com a Elevon também no X.', label: 'Conversas e novidades', Icon: Share2 },
];

function DiscoverySteps() {
  return <div className="steps-grid">
    <RevealOnScroll as="article" className="step-card" variant="fade-up"><span className="step-number">01</span><Search aria-hidden="true" /><h3>Explore</h3><p>Conheça os detalhes da oferta e veja se ela combina com seu objetivo.</p></RevealOnScroll>
    <RevealOnScroll as="article" className="step-card" variant="fade-up" delay={60}><span className="step-number">02</span><ExternalLink aria-hidden="true" /><h3>Acesse</h3><p>Visite a página oficial do produtor pelo link identificado como afiliado.</p></RevealOnScroll>
    <RevealOnScroll as="article" className="step-card" variant="fade-up" delay={120}><span className="step-number">03</span><MousePointer2 aria-hidden="true" /><h3>Decida</h3><p>Confira as condições antes de finalizar uma compra na plataforma externa.</p></RevealOnScroll>
  </div>;
}

export function AboutPage() {
  return <div className="information-page about-page">
    <InternalPageHero eyebrow="POR DENTRO DA ELEVON" Icon={Compass} title={<>Sobre a <span className="gradient-text">Elevon.</span></>} description="A Elevon reúne ofertas de produtos digitais para ajudar você a descobrir ferramentas, treinamentos e novas possibilidades no ambiente digital." illustration="about" action={{ label: 'Conheça nossa proposta', href: '#nossa-proposta' }} />
    <div className="page-shell">
    <section id="nossa-proposta" className="info-grid about-intro-grid">
      <RevealOnScroll as="article" className="panel info-card" variant="slide-right"><span className="section-kicker">NOSSA PROPOSTA</span><h2>Um ponto de partida.<br />Novas possibilidades.</h2><p>Somos uma plataforma de descoberta e recomendação de produtos digitais de terceiros. Reunimos as ofertas em um só lugar para tornar sua exploração mais simples.</p><p>Você conhece a proposta de cada produto aqui e consulta os detalhes e as condições diretamente na página do produtor.</p><Link to="/produtos" className="text-link">Explore o catálogo <ArrowRight size={17} aria-hidden="true" /></Link></RevealOnScroll>
      <RevealOnScroll as="article" className="panel info-card" variant="slide-left" delay={70}><span className="section-kicker">O QUE VOCÊ ENCONTRA AQUI</span><h2>Conhecimento e ferramentas<br />para o seu próximo passo.</h2><div className="about-categories"><div><BookOpen aria-hidden="true" /><h3>Treinamentos digitais</h3><p>Ofertas relacionadas a criação, edição de vídeo, IA e negócios digitais.</p></div><div><Layers3 aria-hidden="true" /><h3>Ferramentas digitais</h3><p>Recursos para explorar novas possibilidades de trabalho no digital.</p></div></div></RevealOnScroll>
    </section>
    <section className="content-section"><div className="section-heading"><span className="section-kicker">DA DESCOBERTA À ESCOLHA</span><h2>Como funciona a Elevon</h2><p>Você explora por aqui. A decisão e a compra acontecem na plataforma do produtor.</p></div><DiscoverySteps /></section>
    <RevealOnScroll as="section" className="panel commitment" variant="fade-up"><div className="icon-box"><ShieldCheck aria-hidden="true" /></div><div><span className="section-kicker">CLAREZA EM CADA ETAPA</span><h2>Nosso compromisso<br />com a transparência.</h2><p>Podemos receber uma comissão pelas compras feitas por meio dos nossos links de afiliado. Preços, condições de acesso, garantias e suporte são definidos pelo produtor.</p><Link className="text-link" to="/normas">Leia nossas normas <ArrowUpRight size={17} aria-hidden="true" /></Link></div></RevealOnScroll>
    </div>
  </div>;
}

const policies = [
  { id: 'afiliacao', Icon: Link2, title: 'Transparência de afiliação', text: 'A Elevon divulga ofertas de produtos digitais de terceiros por meio de links de afiliado. Podemos receber uma comissão se uma compra for realizada a partir desses links.', detail: 'Essa relação comercial é identificada nas páginas de produto. A indicação não representa garantia de resultados ou de adequação às suas necessidades.', label: 'Links de afiliados identificados' },
  { id: 'links', Icon: ExternalLink, title: 'Como funcionam os links', text: 'Ao acessar uma oferta, você sai da Elevon e é direcionado à página do produtor ou à plataforma externa de compra.', detail: 'Confira o endereço, a descrição, o preço e as condições exibidos no destino. As plataformas externas têm seus próprios termos e políticas de privacidade.', label: 'Compra em plataforma externa' },
  { id: 'responsabilidades', Icon: Workflow, title: 'Responsabilidade pelos produtos', text: 'A Elevon apresenta as ofertas e não realiza a venda, a cobrança ou a entrega dos produtos. Esses processos são de responsabilidade dos respectivos produtores e plataformas.', detail: 'Conteúdo, funcionalidades, preço, acesso, garantias, reembolsos e suporte devem ser consultados com o produtor. As condições podem mudar na página oficial.', label: 'Condições definidas pelo produtor' },
  { id: 'privacidade', Icon: ShieldCheck, title: 'Privacidade e seus dados', text: 'Este site não solicita cadastro nem informações de pagamento. As preferências de tema e de animação são armazenadas localmente no seu navegador para serem mantidas nas próximas visitas.', detail: 'A infraestrutura de hospedagem pode processar dados técnicos necessários à entrega e à segurança do site. Ao abrir links externos, aplicam-se as políticas das respectivas plataformas.', label: 'Preferências visuais no navegador' },
];

export function PoliciesPage() {
  return <div className="information-page policies-page">
    <InternalPageHero eyebrow="CLAREZA E CONFIANÇA" Icon={ShieldCheck} title={<>Normas e<br /><span className="gradient-text">transparência.</span></>} description="Entenda como a Elevon divulga ofertas, como funcionam os links e quais são as responsabilidades em cada etapa." illustration="normas" action={{ label: 'Ver normas completas', href: '#normas-completas' }} />
    <div className="page-shell">
    <section id="normas-completas" className="policy-grid" aria-label="Informações de transparência">{policies.map(({ id, Icon, title, text, detail, label }, index) => <RevealOnScroll as="article" id={id} className="panel policy-card" key={id} variant="fade-up" delay={index % 2 * 70}><div className="icon-box"><Icon aria-hidden="true" /></div><div><h2>{title}</h2><p>{text}</p><details><summary>Saiba mais <ArrowDown size={15} aria-hidden="true" /></summary><p>{detail}</p></details><span className="policy-label"><Check size={14} aria-hidden="true" />{label}</span></div></RevealOnScroll>)}</section>
    <section className="info-grid policy-bottom"><div><div className="section-heading"><span className="section-kicker">INFORMAÇÃO PARA DECIDIR</span><h2>Dúvidas frequentes</h2><p>Respostas claras antes de seguir para uma oferta.</p></div><div className="faq-list"><details><summary>A Elevon é uma loja?<ArrowDown size={17} aria-hidden="true" /></summary><p>A Elevon reúne e recomenda ofertas de terceiros. As compras são concluídas em plataformas externas, com as condições definidas pelo produtor.</p></details><details><summary>Os resultados são garantidos?<ArrowDown size={17} aria-hidden="true" /></summary><p>Não. A apresentação de uma oferta não representa uma promessa de ganhos, vendas ou resultados. Avalie a descrição e as condições do produto antes de comprar.</p></details><details><summary>Quem oferece suporte e reembolso?<ArrowDown size={17} aria-hidden="true" /></summary><p>O produtor e a plataforma externa de compra definem os canais de suporte, as garantias e as regras de reembolso. Consulte essas informações na página oficial da oferta.</p></details><details><summary>Como a publicidade é identificada?<ArrowDown size={17} aria-hidden="true" /></summary><p>Os links comerciais são identificados como links de afiliado. A Elevon pode receber uma comissão quando você compra por meio deles.</p></details><details><summary>Como acompanho a Elevon?<ArrowDown size={17} aria-hidden="true" /></summary><p>Encontre nossos perfis oficiais na <Link className="text-link" to="/redes">página de redes</Link>. Não solicitamos dados de pagamento neste site.</p></details></div></div><RevealOnScroll as="article" className="panel commitment" variant="fade-up"><div className="icon-box"><Eye aria-hidden="true" /></div><div><span className="section-kicker">NOSSO COMPROMISSO</span><h2>Mais contexto.<br />Escolhas conscientes.</h2><p>Informação clara sobre a oferta, a relação de afiliação e o caminho até a página oficial.</p><ul className="check-list"><li><Check size={16} aria-hidden="true" />Afiliação identificada</li><li><Check size={16} aria-hidden="true" />Sem promessas de resultados</li><li><Check size={16} aria-hidden="true" />Compra na plataforma externa</li></ul></div></RevealOnScroll></section>
    </div>
  </div>;
}

export function SocialPage() {
  return <div className="information-page social-page">
    <InternalPageHero eyebrow="REDES E CONEXÕES" Icon={Share2} title={<>Conecte-se<br />com a <span className="gradient-text">Elevon.</span></>} description="Acompanhe nossos conteúdos e novas descobertas no digital. Escolha seu canal e faça parte dessa conexão." illustration="redes" />
    <div className="page-shell">
    <section className="social-grid" aria-label="Redes oficiais da Elevon">{socialLinks.map(({ name, handle, url, description, label, Icon }, index) => <RevealOnScroll as="article" className={`panel social-card social-${index}`} key={name} variant="card" delay={index * 60}><span className="social-topic">{label}</span><div className="social-brand"><div className="icon-box"><Icon aria-hidden="true" /></div><div><h2>{name}</h2><p className="social-handle">{handle}</p></div></div><p>{description}</p><a className="button button-primary" href={url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir perfil da Elevon no ${name} em nova aba`}>Abrir perfil <ArrowUpRight size={18} aria-hidden="true" /></a></RevealOnScroll>)}</section>
    <RevealOnScroll as="section" className="panel commitment social-commitment" variant="fade-up"><div className="icon-box"><Globe2 aria-hidden="true" /></div><div><span className="section-kicker">CONTINUE EXPLORANDO</span><h2>Seu próximo passo<br />pode começar aqui.</h2><p>Conheça as seis ofertas do catálogo e encontre os temas que combinam com os seus interesses.</p><Link className="text-link" to="/produtos">Explorar produtos <ArrowRight size={18} aria-hidden="true" /></Link></div><Sparkles className="commitment-sparkle" aria-hidden="true" /></RevealOnScroll>
    </div>
  </div>;
}

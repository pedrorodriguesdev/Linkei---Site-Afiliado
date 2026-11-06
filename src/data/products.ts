export type Product = {
  slug: string;
  name: string;
  category: 'Treinamento digital' | 'Ferramenta digital';
  description: string;
  image: string | null;
  offerUrl: string;
  purchaseUrl: string;
  topics: string[];
  audience: string[];
  note?: string;
};

/**
 * Real artwork can be added under public/images/products/ and mapped here by slug.
 * Keep image null until an actual image is supplied. Recommended format: WebP.
 * Example: image: '/images/products/ia-academy.webp'.
 * Product media uses object-fit: contain to preserve text and complete artwork.
 */
export const products: Product[] = [
  {
    slug: 'seja-seu-chefe',
    name: 'Seja Seu Chefe',
    category: 'Treinamento digital',
    description: 'Treinamento relacionado a habilidades digitais, design, inteligência artificial e criação audiovisual.',
    image: null,
    offerUrl: 'https://kiwify.app/QdHUgoQ?afid=n7WFMNCa',
    purchaseUrl: 'https://pay.kiwify.com.br/Z2UpkR6?afid=n7WFMNCa',
    topics: ['Habilidades digitais', 'Design e inteligência artificial', 'Criação audiovisual'],
    audience: ['Quem quer explorar habilidades no ambiente digital', 'Pessoas interessadas em design e criação audiovisual', 'Quem busca conhecer possibilidades de uso da IA'],
  },
  {
    slug: 'metodo-tiktok-shop',
    name: 'Método TikTok Shop',
    category: 'Treinamento digital',
    description: 'Treinamento relacionado à criação de conteúdo e comercialização de produtos pelo TikTok Shop.',
    image: null,
    offerUrl: 'https://kiwify.app/BavKMki?afid=CDZf9Pcg',
    purchaseUrl: 'https://pay.kiwify.com.br/iUlKLV3?afid=CDZf9Pcg',
    topics: ['Criação de conteúdo', 'TikTok Shop', 'Comercialização de produtos'],
    audience: ['Pessoas interessadas em criar conteúdo para o TikTok', 'Quem deseja conhecer o ambiente do TikTok Shop', 'Quem está explorando a comercialização de produtos pelo TikTok Shop'],
  },
  {
    slug: 'ia-academy',
    name: 'IA Academy',
    category: 'Treinamento digital',
    description: 'Oferta educacional relacionada à criação de conteúdo utilizando inteligência artificial.',
    image: null,
    offerUrl: 'https://cakto.app/4nxy9Bi/?affiliate=qdE87KzY',
    purchaseUrl: 'https://cakto.app/4nxy9Bi/?affiliate=qdE87KzY',
    topics: ['Inteligência artificial', 'Criação de conteúdo', 'Aprendizagem no ambiente digital'],
    audience: ['Quem tem interesse em inteligência artificial', 'Criadores de conteúdo que querem explorar IA', 'Pessoas em busca de novas possibilidades de criação'],
  },
  {
    slug: 'primeira-venda-24h',
    name: 'Primeira Venda em 24H',
    category: 'Treinamento digital',
    description: 'Oferta relacionada a inteligência artificial, Micro SaaS e primeiros passos em negócios digitais.',
    image: null,
    offerUrl: 'https://cakto.app/AbtYRgv/?affiliate=AEJBT6X4',
    purchaseUrl: 'https://cakto.app/AbtYRgv/?affiliate=AEJBT6X4',
    topics: ['Inteligência artificial', 'Micro SaaS', 'Negócios digitais'],
    audience: ['Quem quer explorar negócios no ambiente digital', 'Pessoas interessadas em Micro SaaS', 'Quem busca conhecer aplicações da inteligência artificial'],
    note: '“Primeira Venda em 24H” é o nome do produto. Ele não representa uma promessa de realizar uma venda em 24 horas nem uma garantia de resultados.',
  },
  {
    slug: 'edicao-dinamica-capcut',
    name: 'Edição Dinâmica com CapCut',
    category: 'Treinamento digital',
    description: 'Treinamento voltado ao desenvolvimento de habilidades em edição de vídeo com CapCut.',
    image: null,
    offerUrl: 'https://pay.cakto.com.br/dfrwuik?affiliate=bpY25MGa',
    purchaseUrl: 'https://pay.cakto.com.br/dfrwuik?affiliate=bpY25MGa',
    topics: ['Edição de vídeo', 'CapCut', 'Habilidades audiovisuais'],
    audience: ['Pessoas interessadas em edição de vídeo', 'Criadores de conteúdo que utilizam o CapCut', 'Quem quer desenvolver habilidades audiovisuais'],
    note: 'O link disponível leva diretamente à página externa de compra. Confira a descrição e todas as condições nessa plataforma antes de decidir.',
  },
  {
    slug: 'livego-pro',
    name: 'LiveGo Pro',
    category: 'Ferramenta digital',
    description: 'Ferramenta relacionada à operação e organização de transmissões comerciais e lives para TikTok Shop.',
    image: null,
    offerUrl: 'https://cakto.app/3Y9srR7/?affiliate=F9M4v4aw',
    purchaseUrl: 'https://pay.cakto.com.br/9kxhf5b_1037858?affiliate=F9M4v4aw',
    topics: ['Transmissões comerciais', 'Organização de lives', 'TikTok Shop'],
    audience: ['Quem organiza transmissões comerciais', 'Pessoas interessadas em lives para TikTok Shop', 'Quem busca conhecer ferramentas para operações ao vivo'],
    note: 'LiveGo Pro é uma ferramenta digital. Confira as funcionalidades, os requisitos e as condições de uso na página oficial.',
  },
];

# Elevon

Plataforma de descoberta e indicação de seis produtos digitais, em português brasileiro.

## Desenvolvimento

Requisitos: Node.js 22+ e npm.

```sh
npm ci
npm run dev
```

```sh
npm run check
npm run verify
npm run build
```

O build estático é gerado em `dist/`. Pode ser publicado em hospedagem estática. O build cria páginas de entrada com metadados exclusivos para todas as 11 rotas. O endereço-base de SEO está em `scripts/static-routes.mjs`; ajuste-o ao publicar em outro domínio.

## Estrutura

- `src/main.tsx`: navegação, tema, busca, catálogo e página inicial.
- `src/data/products.ts`: fonte única dos seis produtos e URLs de afiliação.
- `src/pages/ProductDetail.tsx`: modelo compartilhado de detalhes.
- `src/pages/InformationPages.tsx`: Sobre, Normas e Redes.
- `src/components/EarthVisual.tsx`: seleção entre o globo estático e 3D.
- `src/components/DesktopEarth.tsx`: cena Three.js carregada sob demanda.
- `src/style.css`: identidade visual e layouts responsivos.

## Adicionar as imagens reais

Nenhuma arte de produto foi gerada. Os seis valores `image` permanecem `null`.

1. Coloque a arte real em `public/images/products/`.
2. No objeto do produto correto em `src/data/products.ts`, defina `image` usando seu slug estável. Exemplo: `image: '/images/products/ia-academy.webp'`.
3. Rode o build e publique novamente. As imagens usam `object-fit: contain`, preservando textos e a arte completa.

Slugs: `seja-seu-chefe`, `metodo-tiktok-shop`, `ia-academy`, `primeira-venda-24h`, `edicao-dinamica-capcut`, `livego-pro`.

## Globo e desempenho

O desktop a partir de 1024px, com ponteiro preciso e recursos adequados, carrega Three.js em um bundle separado quando o globo se aproxima da área visível. A presença da API WebGL2 é verificada sem criar um contexto descartável; a própria criação do renderer confirma o suporte real. O shader combina texturas geográficas diurnas e noturnas, nuvens e atmosfera. A rotação dura aproximadamente 180 segundos. A animação pausa fora da tela ou com a aba oculta; os recursos da GPU são descartados ao desmontar.

No celular e tablet, em preferência por movimento reduzido, em economia de dados, em conexões lentas ou com memória/processamento limitados, o site usa apenas a projeção estática WebP. Não inicializa WebGL nem carrega Three.js nesses casos. O fallback só desaparece após o primeiro quadro válido; falhas de shader, contexto ou textura preservam a imagem estática. Mudanças de viewport e de preferências desmontam a cena com limpeza de recursos. As fontes das texturas estão em `public/earth/SOURCES.txt`; a licença da fonte está em `public/fonts/OFL.txt`.

## Conteúdo e privacidade

Não há banco de dados, cadastro, carrinho ou checkout interno. A preferência de tema usa armazenamento local. Os links comerciais preservam os endereços informados e usam `sponsored noopener noreferrer`. Conteúdo, preço, acesso, suporte e reembolso devem ser conferidos com o produtor. Não há pixels de publicidade ou analytics adicionados.

## Validação e limites

`npm run check` executa TypeScript. `npm run verify` executa testes de integração DOM. `npm run build` compila e gera entradas estáticas. Os testes DOM não substituem inspeção visual em navegador real. As metas de Core Web Vitals e a conformidade WCAG não foram certificadas. O comportamento WebGL depende da GPU e possui fallback estático.

## Refinamento V2: movimento e navegação

- `src/components/RevealOnScroll.tsx` e `reveal.css`: sistema reutilizável de fade-up, fade-in, slide-left, slide-right e entrada de cards. Cada elemento possui duração, delay e limiar configuráveis. As listas aplicam stagger por card. Observers são compartilhados por configuração e descartados quando não possuem alvos.
- O HTML começa visível. Apenas elementos fora da tela recebem estado pendente. O conteúdo continua no documento acessível; foco por teclado e movimento reduzido mostram o elemento imediatamente. As entradas acontecem uma vez por montagem e não alteram dimensões. Não existem handlers de wheel/touch ou bibliotecas de rolagem.
- `src/components/SectionNavigation.tsx` e `section-navigation.css`: âncoras nativas, navegação fixa e destaque `aria-current` por IntersectionObserver. Os offsets compensam o cabeçalho e as tabs. Movimento reduzido usa navegação instantânea.
- `src/refinements.css`: acabamento de cards, botões, cabeçalho, transições entre seções, tema claro e alvos de toque. No detalhe mobile, nome/CTA aparecem antes da mídia vazia.
- `src/components/earthRuntime.ts`: critério de capacidade e controlador único de requestAnimationFrame. A rotação usa delta de tempo limitado, completa uma volta em 180 segundos e reinicia o relógio ao retomar da pausa para evitar saltos.
- `src/main.tsx`, `src/pages/ProductDetail.tsx` e `src/pages/InformationPages.tsx`: integração incremental nas páginas existentes. O catálogo e seus links em `src/data/products.ts` não foram alterados.

### Verificação V2

`npm run verify` executa os testes DOM e os testes de lógica/ciclo de vida do globo. Os testes usam jsdom, IntersectionObserver controlado e um renderer Three simulado; verificam transições, navegação, fallback, avanço da rotação, pausas e liberação de recursos. Esses testes não comprovam qualidade visual nem a execução real dos shaders em uma GPU. Não foram realizadas inspeção em navegador real, medições Lighthouse/Core Web Vitals ou certificação de acessibilidade neste ambiente.

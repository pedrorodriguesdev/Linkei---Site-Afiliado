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

O desktop a partir de 900px carrega Three.js em um bundle separado quando o globo se aproxima da área visível. O shader combina texturas geográficas diurnas e noturnas, nuvens e atmosfera. A rotação dura aproximadamente 180 segundos. A animação pausa fora da tela ou com a aba oculta; os recursos da GPU são descartados ao desmontar.

No celular, em preferência por movimento reduzido, em economia de dados ou conexão 2G, o site usa apenas a projeção estática WebP. Não inicializa WebGL nem carrega Three.js nesses casos. As fontes das texturas estão em `public/earth/SOURCES.txt`; a licença da fonte está em `public/fonts/OFL.txt`.

## Conteúdo e privacidade

Não há banco de dados, cadastro, carrinho ou checkout interno. A preferência de tema usa armazenamento local. Os links comerciais preservam os endereços informados e usam `sponsored noopener noreferrer`. Conteúdo, preço, acesso, suporte e reembolso devem ser conferidos com o produtor. Não há pixels de publicidade ou analytics adicionados.

## Validação e limites

`npm run check` executa TypeScript. `npm run verify` executa testes de integração DOM. `npm run build` compila e gera entradas estáticas. Os testes DOM não substituem inspeção visual em navegador real. As metas de Core Web Vitals e a conformidade WCAG não foram certificadas. O comportamento WebGL depende da GPU e possui fallback estático.

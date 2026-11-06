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

A Terra inicia e gira automaticamente em desktop, tablet e celular, sem botão e sem clique prévio, conforme o pedido atual do proprietário. Three.js continua em um bundle separado, importado quando o globo se aproxima da área visível. A inicialização tenta o renderer real, evitando bloqueios indevidos por uma checagem de construtor; a criação do contexto confirma o suporte. O shader combina texturas geográficas diurnas/noturnas, nuvens e atmosfera, com espaços de cor corretos e saída sRGB. As luzes urbanas reais são atenuadas no lado diurno.

A rotação completa uma volta em aproximadamente 180 segundos e as nuvens em 210 segundos. Um único requestAnimationFrame atualiza diretamente os objetos 3D, sem renderização React a cada quadro. Desenhos em frequência menor preservam a velocidade angular. O relógio é reiniciado depois de pausas para evitar saltos; a animação pausa fora da tela ou com a aba oculta.

O perfil móvel usa texturas WebP derivadas dos mesmos mapas reais, com 768×384 pixels (aproximadamente 112 KB somadas), geometria menor e DPR limitado inicialmente a 1,15. Não há pointer tracking no perfil móvel. Desktop usa as texturas detalhadas preservadas e DPR até 1,5. As informações de memória, processamento e conexão só escolhem o perfil inicial, sem desativar a rotação por largura.

O controlador adaptativo observa os intervalos entre desenhos e o tempo da chamada de renderização em janelas de pelo menos dois segundos. Dois períodos ruins reduzem a qualidade; cinco períodos saudáveis permitem recuperação, respeitando intervalos mínimos de 8 segundos para reduzir e 15 segundos para recuperar. Os níveis reduzem resolução e limitam desenhos a 60/30/24 por segundo. No nível mínimo, as nuvens são incorporadas ao shader da superfície, reduzindo overdraw sem remover sua aparência. Isso não representa FPS medido em aparelhos reais. Não há recriação do renderer nessas trocas nem durante resize. Texturas escolhidas no início da cena são reutilizadas em resize, evitando downloads duplicados.

A projeção estática permanece durante o carregamento e só desaparece após um quadro válido. API incompatível, falhas de shader/contexto/textura ou limitação severa persistente de renderização usam esse fallback. A preferência de movimento reduzido continua valendo para os reveals e demais efeitos do site; a Terra segue a exigência específica mais recente de rotação automática e contínua. Tamanho de tela, toque e economia de dados, isoladamente, não desativam a rotação. Todos os recursos são liberados ao desmontar. As fontes estão em `public/earth/SOURCES.txt`; a licença da fonte tipográfica está em `public/fonts/OFL.txt`.

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

## Refinamento V3: rotação universal e mobile

A causa da Terra estática era a política V2: `canAnimateEarth` exigia viewport >=1024px e ponteiro preciso, enquanto uma media query escondia o canvas abaixo de 1024px. Ambas as restrições foram removidas. O arquivo `DesktopEarth.tsx` mantém o nome existente por compatibilidade, mas agora renderiza também em celular e tablet.

O catálogo móvel preserva “Explore nossas ofertas digitais.” e “Encontre seu próximo passo.”, com Terra centralizada, ponte visual suave até a vitrine, busca de 51px, filtros horizontais e uma oferta por linha. Os espaços de mídia continuam vazios. O sistema de reveal existente foi reutilizado e estendido ao rodapé; o stagger móvel pode ser ajustado separadamente, com entradas de 50ms entre cards adjacentes. A navegação continua nativa e o movimento reduzido mostra o conteúdo imediatamente.

### Arquivos V3

- `src/components/EarthVisual.tsx`, `DesktopEarth.tsx`, `earthRuntime.ts`, `earth.css`: política universal, perfis, rotação, shaders, adaptação e fallback.
- `public/earth/day-mobile.webp`, `night-mobile.webp`, `clouds-mobile.webp`, `SOURCES.txt`: mapas móveis derivados e documentação.
- `src/main.tsx`, `src/refinements.css`: hero, transição ao catálogo, vitrine, filtros, detalhes e rodapé.
- `src/components/RevealOnScroll.tsx`, `reveal.css`: tempo móvel configurável e movimento de entrada.
- `scripts/verify-earth.mjs`, `scripts/verify.mjs`: regressões, rotação em diferentes frequências, integração mobile e adaptação simulada.
- `README.md`: documentação atualizada.

As verificações usam DOM e renderer simulado. Não comprovam renderização real dos shaders, ausência de overflow visual, qualidade de imagem, suavidade em GPU real ou Core Web Vitals. Esses pontos precisam de inspeção em navegador real, indisponível neste ambiente.

## Rotação automática e realismo

O globo inicia automaticamente em cada visita, sem estados de play/pause e sem controles visíveis. A rotação continua enquanto o globo está visível; ocultar a aba ou sair da área visível pausa o trabalho gráfico, que retoma sozinho ao retornar. Há um único requestAnimationFrame e nenhuma atualização React por quadro.

O mapa dedicado `city-lights.webp`/`city-lights-mobile.webp` vem de Solar System Scope, sob CC BY 4.0. Ele é tratado como dado de emissão, com os pontos urbanos separados do fundo e visibilidade controlada pelo lado noturno. O albedo diurno continua em sRGB. Créditos e licença estão no rodapé e em `public/earth/SOURCES.txt` e `CITY-LIGHTS-LICENSE.txt`.

A camada de nuvens usa um mapa independente, transparência mais definida e rotação relativa de 210 segundos. A atmosfera conserva o halo fino. O perfil econômico incorpora as nuvens à superfície em vez de removê-las.

Adicione `?globeDebug=1` ao endereço para abrir o painel local de diagnóstico. Ele mostra o estado do renderer, tamanho do canvas, quadros efetivamente desenhados e ângulo do objeto. Não há envio de telemetria. O timer de diagnóstico apenas lê valores; não participa da rotação.

Os testes de integração verificam início sem interação, ausência de controles, rotação por duas voltas completas e limpeza dos recursos. Os shaders exatos gerados pelo Three.js foram compilados e renderizados em OpenGL ES 3.2/Mesa, usando as texturas reais, para verificar as nuvens, a emissão noturna e a mudança dos pixels com a rotação. Isso não substitui inspeção no navegador e na GPU de cada visitante.

# Elevon — Ecossistema Digital V8

## Arquitetura e apresentação

A Terra da página inicial foi substituída por uma composição original baseada nas referências. O título, descrição, chamadas, benefícios e ordem móvel do hero continuam no lugar. As três artes das páginas internas e os seis produtos não foram alterados.

`DigitalEcosystem.tsx` monta três cartões HTML: Marketing (Estratégias, Conteúdo, Audiência), Tecnologia (Automação, Integrações, Produtividade) e Ferramentas (Recursos digitais, Apps e plataformas, Soluções digitais). São categorias ilustrativas, sem ações falsas ou promessas de serviços. Seus textos permanecem nítidos e acessíveis no DOM.

O espaço usa perspectiva e transformações CSS 3D, com planos em profundidades distintas, inclinações, oclusão e sombras. Os cartões são HTML, as órbitas e conexões são SVG e a plataforma é CSS. Cinco pequenos tiles vetoriais dão contexto no desktop; apenas dois aparecem no celular.

O núcleo central é uma ilustração de vidro violeta gerada para esta composição e entregue como WebP transparente. A perspectiva e os reflexos do próprio núcleo são pré-renderizados; não há geometria WebGL ou reflexão calculada em tempo real. Não se usa a captura da página como uma imagem de fundo. Não se faz rotação completa dos cartões, preservando a leitura.

## Movimento e preferências

- O visual **anima automaticamente, sem seletor de movimento**.
- O componente não lê nem grava `elevon-motion` ou `elevon-earth`. Escolhas antigas de estático não impedem a animação automática.
- No modo animado, o núcleo e os cartões flutuam poucos pixels, as órbitas oscilam suavemente e o brilho varia em opacidade. A interface reduz os efeitos no celular.
- O parallax só responde a mouse em desktop com ponteiro preciso, hero visível e sem movimento reduzido. Eventos atualizam variáveis CSS via ref; transições suavizam o movimento. Não há estado React por movimento, leituras de layout em cada movimento ou loop JavaScript de frames.
- `IntersectionObserver` e `visibilitychange` desativam as animações fora da tela ou com a aba oculta; elas são recriadas em execução quando o visual volta a ficar ativo. A preferência de movimento reduzido do aparelho continua prevalecendo. Listeners e observers são removidos ao desmontar.
- Com movimento reduzido, toda a composição permanece visível, sem animações ou parallax.

## Responsividade e temas

O desktop mantém o texto à esquerda e a composição à direita. No celular, a ordem previamente aprovada — visual antes do texto — foi preservada; o visual ocupa a largura disponível, sem o limite estreito da Terra. Os cartões são reorganizados em duas posições superiores e uma inferior, com núcleo no centro e menos tiles. A área principal do visual tem 300px no perfil móvel.

O tema claro padrão e o escuro opcional usam cores próprias para vidro, texto, bordas e sombras. Não há inversão de imagens por filtros. Elementos decorativos não recebem foco e os ícones são ocultados da leitura assistiva quando redundantes.

## Limpeza e desempenho observado

Foram removidos `EarthVisual.tsx`, `DesktopEarth.tsx`, `earthRuntime.ts`, `earth.css`, a suíte antiga `verify-earth.mjs` e as 12 imagens WebP que só o globo utilizava. Os registros de fontes/licenças e documentos históricos permanecem. `three` e `@types/three` foram retirados das dependências. O build atual não contém chunk Three.js, mapas da Terra ou canvas.

O núcleo pesa 123.472 bytes no desktop e 45.418 bytes no celular, contra 320.706/91.566 bytes dos antigos fallbacks estáticos. O navegador escolhe apenas uma variante. No modo animado também deixam de existir os três atlas anteriores e o renderer WebGL. Não há novas dependências.

Comparação do Vite nesta execução:

| Saída | Antes | V8 |
| --- | ---: | ---: |
| JS inicial, gzip aproximado | 101,20 KB | 101,71 KB |
| Chunk adicional do renderer, gzip | 123,30 KB | removido |
| CSS, gzip aproximado | 13,15 KB | 14,78 KB |

O JS inicial cresce ligeiramente com o novo componente; a redução vem das imagens, da remoção do chunk opcional e da ausência do renderer. Como o modo anterior também iniciava estático, não se contabiliza o chunk opcional como download obrigatório na primeira visita. Não foram medidos FPS, uso de GPU física ou Core Web Vitals. CSS pode usar composição por GPU; isso não representa custo zero.

## Arquivos principais

- `src/components/DigitalEcosystem.tsx` e `digital-ecosystem.css`: composição e ciclo de vida.
- `src/main.tsx`: troca do visual na página inicial.
- `src/style.css` e `src/refinements.css`: remoção dos estilos mortos e novo nome da área do grid, mantendo o layout.
- `src/pages/InformationPages.tsx`: somente a referência de privacidade a “animação”, substituindo “movimento do globo”.
- `public/images/heroes/digital-core{,-mobile}.webp`: núcleo transparente otimizado.
- `package.json`/lockfile: retirada de Three.js e substituição da suíte de testes.
- `scripts/verify.mjs`, `scripts/verify-ecosystem.mjs`, README e este relatório: validação/documentação.
- [cloudflare-git.md](cloudflare-git.md): diagnóstico separado da integração Git.

## Testes e limitações

Passaram 685 verificações da aplicação e 269 do ecossistema: **954 no total**. A suíte verifica animação automática mesmo com opções antigas salvas ou armazenamento bloqueado, ausência do seletor de movimento, preferência de movimento reduzido, visibilidade da aba/viewport, parallax restrito, limpeza de listeners, ausência de RAF e WebGL, arquivos de imagem e conteúdo dos cartões. Navegação, busca, filtros, páginas de produto, parâmetros dos links comerciais e artes internas continuam cobertos.

TypeScript, Vite e geração das 11 entradas estáticas passaram. O artefato foi inspecionado para confirmar a ausência do renderer e das imagens antigas. As propriedades CSS e a arquitetura responsiva foram revisadas; jsdom não calcula o layout visual real.

A arte do núcleo foi inspecionada visualmente. A ferramenta de navegador exigida pelo preview gerenciado do Sites não está disponível neste ambiente; não foram feitas capturas reais do hero em navegador, comparação pixel a pixel ou medições de suavidade/GPU. O acabamento final em diferentes navegadores e GPUs ainda precisa dessa inspeção. O acesso à conta Cloudflare também não está disponível: a publicação no Sites e o push ao GitHub não confirmam que o Cloudflare tenha recuperado sua própria autorização.

## Inicialização automática e retorno à página

A montagem sincroniza imediatamente a visibilidade do documento e mede uma vez os limites do visual. Assim, um hero que já está na tela começa a animar antes mesmo da primeira entrega assíncrona do IntersectionObserver. Os eventos `pageshow`, `pagehide`, `visibilitychange` e resize ressincronizam o estado ao sair ou voltar, inclusive quando a página é restaurada do cache de navegação. Não foi introduzido loop JavaScript.

A folha CSS cria as animações somente com `data-motion=animated` e `data-active=true`. O estado inativo remove a animação em vez de criá-la previamente pausada. Entrada inicial e retorno à página usam a mesma ativação automática das animações. Os listeners adicionados são removidos ao desmontar.

A regressão de inicialização, sem evento manual do observer ou seletor, falhou no código anterior e passou após o ajuste. Os testes agora aplicam a folha CSS real ao DOM e verificam a presença das animações do núcleo/cartões, a remoção com movimento reduzido ou fora da tela e a ativação sem qualquer interação. Também cobrem retorno à página, opções antigas ignoradas e limpeza de listeners. Isso valida o fluxo e as declarações CSS; não equivale a medir quadros reais em um navegador Android.

## Leitura dos cartões

Os títulos agora usam peso 800 e os itens, peso 600, com letras maiores e entrelinha mais confortável. O tema claro usa títulos em `#1b1535` e itens em `#332a4f`; no escuro, títulos brancos e itens em `#f0ecff`. Os painéis de vidro claros receberam mais opacidade para reduzir a interferência das órbitas e do núcleo atrás do texto. A legenda foi ampliada e ganhou peso.

As telas menores preservam itens de pelo menos 12px; detalhes decorativos de fundo e pontos dos cabeçalhos são retirados quando disputam espaço com as palavras. Na faixa estreita de tablet, os ícones dos cabeçalhos também dão lugar ao texto. O cartão inferior e a legenda receberam espaçamento para acomodar a tipografia maior.

Um cálculo conservador, combinando os dois extremos do vidro com fundos preto/branco, encontrou contraste mínimo amostrado de 5,85:1 para os itens no tema claro e 7,14:1 no escuro. Esse cálculo ajuda a verificar a paleta, mas não certifica o resultado visual real sob perspectiva, reflexos e antialiasing. A inspeção de navegador permanece limitada pelo ambiente.

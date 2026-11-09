# Elevon — Ecossistema Digital V8

## Arquitetura e apresentação

A Terra da página inicial foi substituída por uma composição original baseada nas referências. O título, descrição, chamadas, benefícios e ordem móvel do hero continuam no lugar. As três artes das páginas internas e os seis produtos não foram alterados.

`DigitalEcosystem.tsx` monta três cartões HTML: Marketing (Estratégias, Conteúdo, Audiência), Tecnologia (Automação, Integrações, Produtividade) e Ferramentas (Recursos digitais, Apps e plataformas, Soluções digitais). São categorias ilustrativas, sem ações falsas ou promessas de serviços. Seus textos permanecem nítidos e acessíveis no DOM.

O espaço usa perspectiva e transformações CSS 3D, com planos em profundidades distintas, inclinações, oclusão e sombras. Os cartões são HTML, as órbitas e conexões são SVG e a plataforma é CSS. Cinco pequenos tiles vetoriais dão contexto no desktop; apenas dois aparecem no celular.

O núcleo central é uma ilustração de vidro violeta gerada para esta composição e entregue como WebP transparente. A perspectiva e os reflexos do próprio núcleo são pré-renderizados; não há geometria WebGL ou reflexão calculada em tempo real. Não se usa a captura da página como uma imagem de fundo. Não se faz rotação completa dos cartões, preservando a leitura.

## Movimento e preferências

- O padrão continua **Estático**. O seletor passou de “Globo” para **Animação**, com as opções Estático/Animado.
- Escolhas explícitas são salvas em `elevon-motion`. Se essa chave ainda não existir, uma escolha antiga `animated` de `elevon-earth` é respeitada. Valores inválidos, modo automático antigo ou armazenamento indisponível resultam em estático. Um valor novo estático tem prioridade sobre uma escolha antiga animada.
- No modo animado, o núcleo e os cartões flutuam poucos pixels, as órbitas oscilam suavemente e o brilho varia em opacidade. A interface reduz os efeitos no celular.
- O parallax só responde a mouse em desktop com ponteiro preciso, animação habilitada e hero visível. Eventos atualizam variáveis CSS via ref; transições suavizam o movimento. Não há estado React por movimento, leituras de layout em cada movimento ou loop JavaScript de frames.
- `IntersectionObserver` e `visibilitychange` pausam as animações fora da tela ou com a aba oculta. As preferências de movimento reduzido prevalecem, sem apagar a escolha salva. Listeners e observers são removidos ao desmontar.
- Em estático, toda a composição permanece visível, sem animações ou parallax.

## Responsividade e temas

O desktop mantém o texto à esquerda e a composição à direita. No celular, a ordem previamente aprovada — visual antes do texto — foi preservada; o visual ocupa a largura disponível, sem o limite estreito da Terra. Os cartões são reorganizados em duas posições superiores e uma inferior, com núcleo no centro e menos tiles. A área principal do visual tem 300px no perfil móvel.

O tema claro padrão e o escuro opcional usam cores próprias para vidro, texto, bordas e sombras. Não há inversão de imagens por filtros. O seletor mantém foco e navegação nativos; elementos decorativos não recebem foco e os ícones são ocultados da leitura assistiva quando redundantes.

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

Passaram 667 verificações da aplicação e 243 do ecossistema: **910 no total**. A suíte verifica persistência, migração, armazenamento bloqueado, modo estático, preferência de movimento reduzido, visibilidade da aba/viewport, parallax restrito, limpeza de listeners, ausência de RAF e WebGL, arquivos de imagem e conteúdo dos cartões. Navegação, busca, filtros, páginas de produto, parâmetros dos links comerciais e artes internas continuam cobertos.

TypeScript, Vite e geração das 11 entradas estáticas passaram. O artefato foi inspecionado para confirmar a ausência do renderer e das imagens antigas. As propriedades CSS e a arquitetura responsiva foram revisadas; jsdom não calcula o layout visual real.

A arte do núcleo foi inspecionada visualmente. A ferramenta de navegador exigida pelo preview gerenciado do Sites não está disponível neste ambiente; não foram feitas capturas reais do hero em navegador, comparação pixel a pixel ou medições de suavidade/GPU. O acabamento final em diferentes navegadores e GPUs ainda precisa dessa inspeção. O acesso à conta Cloudflare também não está disponível: a publicação no Sites e o push ao GitHub não confirmam que o Cloudflare tenha recuperado sua própria autorização.

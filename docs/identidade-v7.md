# Elevon — identidade visual V7

## Implementação

O site existente recebeu a direção branco/lavanda/roxo da referência. Não foi criada outra aplicação. A Terra V6 permanece na página inicial, com seu renderer, rotação, preferências e otimizações preservados. Sobre, Normas e Redes usam três ilustrações próprias, sem novos canvases. O planeta decorativo do catálogo foi removido para manter o foco nos produtos.

## Tema padrão e preferências

`index.html` declara o tema claro e aplica a escolha persistida antes de montar o React. Só o valor salvo `dark` ativa o tema escuro; ausência, valor inválido ou armazenamento indisponível resultam em claro. A preferência do sistema operacional não muda esse padrão. A cor da interface do navegador acompanha a escolha desde o bootstrap.

O botão existente do cabeçalho continua alternando os temas sem recarregar a página, usando a chave `elevon-theme`. Na base inspecionada, essa chave era escrita apenas após clicar no botão. Portanto os valores antigos são escolhas explícitas e foram preservados, sem apagar preferências legítimas em uma migração.

Os tokens claros ficam em `:root`; `[data-theme=dark]` mantém a paleta noturna. Catálogo, detalhes, navegação e rodapé compartilham os mesmos tokens. O cabeçalho mantém logo, busca e navegação, com altura desktop de 76px.

## Ilustrações e páginas

As artes foram criadas com a ferramenta de geração de imagens disponível no chat, seguindo a referência fornecida. ImagineArt não foi utilizado na geração, conforme a instrução posterior do proprietário.

- **Sobre:** escultura de E em vidro violeta/azul, pedestal circular e órbita luminosa. A chamada “Conheça nossa proposta” leva à seção existente.
- **Normas:** documento translúcido com escudo e check. A chamada “Ver normas completas” leva aos cartões informativos preservados. A ilustração é decorativa, sem representar certificação externa.
- **Redes:** cartões de Instagram, TikTok e X. Os cartões funcionais abaixo da arte mantêm os três perfis e URLs originais.

`InternalPageHero` compartilha estrutura, badges, título, descrição, chamada opcional e mídia decorativa. As imagens têm `alt=""`, contêiner `aria-hidden` e dimensões declaradas. Textos, navegação e ações continuam em HTML.

## Responsividade e desempenho

Desktop usa texto à esquerda e arte à direita. Abaixo de 768px, título/introdução vêm primeiro, seguidos pela arte, limitada a 390px, e pelo conteúdo da página. O hero ocupa a largura disponível sem cálculos de `100vw`, evitando excesso lateral causado por barras de rolagem clássicas.

Há três WebP RGBA de 1200×800 e três variantes móveis de 640×426 em `public/images/heroes/`. O navegador escolhe uma imagem por página. As versões móveis têm aproximadamente 65–68 KB cada; as maiores, 176–198 KB. A transparência permite a mesma arte nos dois temas, sem filtros de inversão ou arquivos duplicados por tema.

As imagens do hero carregam com prioridade alta e decodificação assíncrona. O movimento decorativo de 6px usa apenas CSS em desktop com ponteiro preciso e sem movimento reduzido; permanece estático no celular. Não há novas dependências, cenas WebGL adicionais ou vídeos de fundo.

## Arquivos

- `index.html`: bootstrap e padrão claro.
- `src/main.tsx`: estado inicial do cabeçalho e remoção do planeta do catálogo.
- `src/style.css`: tokens dos dois temas e altura do cabeçalho.
- `src/pages/InformationPages.tsx`: integração dos três heroes e conteúdo preservado.
- `src/components/InternalPageHero.tsx` e `internal-page-hero.css`: estrutura, apresentação e responsividade compartilhadas.
- `public/images/heroes/`: seis arquivos WebP.
- `scripts/verify.mjs`: regressões de tema, persistência, ilustrações e conteúdo.
- `docs/identidade-v7.md`: este relatório.

## Validação e limites

O build passou com TypeScript, Vite e as 11 entradas estáticas. `npm run verify` passou com 665 verificações DOM e 234 do globo, totalizando 899. A suíte DOM verifica tema antes da montagem, armazenamento inválido/bloqueado, preferências explícitas nos dois temas, navegação, recarga, links comerciais e artes distintas com arquivos locais existentes. As estruturas dos três heroes são verificadas em seis larguras simuladas (360, 390, 430, 768, 1024 e 1440), nos dois temas. Esses testes não calculam o layout visual de um navegador.

A suíte do globo permanece disponível para rotação, único RAF, pausas, qualidade adaptativa, preferências e descarte de recursos. O código do renderer da V6 e os seis produtos, suas artes e parâmetros de afiliação não foram alterados.

As ilustrações geradas foram inspecionadas visualmente. O ambiente não disponibilizou a ferramenta de navegador prevista pelo preview gerenciado do Sites; não foram obtidas capturas reais das páginas nem medições de FPS, GPU ou Lighthouse. A correspondência visual exata e o layout final nos dispositivos precisam de inspeção em navegador real. Não se afirma equivalência pixel a pixel com a referência.

## Proteção contra escurecimento automático no Android

Após o relato de um visitante Android que viu a página escura sem selecionar o tema, foi adicionado `color-scheme: only light` no tema claro, no bootstrap antes da primeira pintura e nos metadados do documento. A escolha manual de escuro muda a indicação para `dark`; ao voltar a claro, restaura `only light`. O objetivo é impedir a transformação automática de cores por navegadores compatíveis sem remover a opção de tema escuro nem apagar escolhas legítimas salvas.

A [documentação do MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color-scheme) indica `only light` como forma de desativar as substituições de cor do Auto Dark Theme do Chrome. O relato não informou o navegador Android específico, e não houve reprodução em aparelho real; portanto não foi confirmada a causa naquele dispositivo. As verificações executam o bootstrap e a troca de tema, incluindo as indicações de esquema ao navegador. Elas não simulam o algoritmo de autoescurecimento do Android.

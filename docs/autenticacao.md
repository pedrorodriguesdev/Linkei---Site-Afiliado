# Autenticação e fluxo de acesso

## Componentes

O Elevon é um frontend estático React/Vite (`package.json`, `vite.config.ts`). Não há servidor de aplicação, banco de usuários, formulário de login, middleware de autenticação, emissão de JWT ou renovação de sessão neste código. O README também documenta a ausência de cadastro e checkout interno em “Conteúdo e privacidade”.

- `index.html`: carrega o tema local e inicia `src/main.tsx`.
- `src/main.tsx`, função `App`: define as rotas com BrowserRouter, sem guardas de autenticação. `SiteHeader.changeTheme` salva somente a preferência de tema.
- `src/data/products.ts`: mantém os dados do catálogo e os destinos comerciais `offerUrl` e `purchaseUrl`.
- `src/pages/ProductDetail.tsx`: resolve o produto pelo slug e monta links externos de oferta e compra.
- `.openai/hosting.json`: identifica o projeto Sites e a pasta estática `dist`; não contém credenciais.

## Fluxo de requisições

1. O navegador solicita a página ao provedor de hospedagem. Na publicação atual do Sites, a configuração consultada em 7 de novembro de 2026 restringe o acesso ao proprietário. Essa autorização é aplicada pela plataforma, fora deste repositório; seu protocolo de cookies/tokens não está implementado aqui.
2. Após o acesso permitido, o navegador recebe HTML, JavaScript, CSS, fontes e texturas. React monta as páginas e o roteador navega entre elas. Busca e filtros são executados no cliente.
3. Os botões de oferta/compra abrem Kiwify ou Cakto. Autenticação, pagamento e acesso ao produto nessas plataformas pertencem a elas; o Elevon não recebe senhas nem resultados de autenticação por callback.

## Credenciais, tokens e armazenamento

O frontend não cria nem armazena access tokens, refresh tokens ou senhas. O armazenamento local contém preferências: `elevon-theme` em `src/main.tsx` e `index.html`, e `elevon-earth` em `src/components/EarthVisual.tsx`. Esses valores não autorizam acesso.

Os parâmetros `afid` e `affiliate` em `src/data/products.ts` são identificadores de indicação expostos nos links comerciais, não tokens de autenticação. Os links de produto usam `sponsored noopener noreferrer` por meio de `externalLinkProps` em `ProductDetail.tsx`.

Credenciais de manutenção do GitHub e do repositório de origem do Sites pertencem às ferramentas de desenvolvimento, não ao aplicativo. Elas não devem ser incluídas no código, no build, em URLs de remotes ou na documentação. `.gitignore` exclui `.env*` (exceto `.env.example`), `node_modules/` e `dist/`. Isso não substitui uma revisão de segredos antes de commits.

## Portabilidade

O controle de acesso do Sites não acompanha o código ao GitHub ou a outra hospedagem. Um repositório privado controla quem vê o código, não quem visita o site. Para restringir visitantes em outro provedor, configure proteção nesse provedor ou implemente autenticação com validação no servidor. Não use preferências do localStorage como autorização.

Não é possível deduzir do frontend como o Sites ou os provedores de checkout armazenam, expiram ou renovam seus próprios cookies e tokens.

# Aviso de conexão Git no Cloudflare Pages

## O que o aviso significa

“Este projeto está desconectado da sua conta Git. Isso pode causar falhas nas implantações” indica um problema na associação ou autorização entre o projeto Pages e o provedor Git. Não identifica, por si só, um erro do React, do comando de build ou da pasta `dist`.

Além das referências de design, o proprietário forneceu depois uma captura do painel Cloudflare. Ela mostra o projeto **ellevon**, o domínio **ellevon.pages.dev**, o repositório **pedrorodriguesdev/Linkei---Site-Afiliado**, o aviso amarelo de desconexão e os deploys automáticos habilitados. A última implantação de produção aparece concluída com sucesso em `main`, no commit `b47e494`, há um dia. Não foi possível inspecionar ao vivo as permissões do aplicativo Cloudflare ou os logs autenticados da conta.

## Fatos verificados

Diagnóstico somente de leitura, em 9 de novembro de 2026:

- A pasta é um repositório Git e a branch ativa é `main`.
- O remote `github` aponta para `https://github.com/pedrorodriguesdev/Linkei---Site-Afiliado.git`.
- O remote `origin` aponta para o repositório de origem do Sites em `git.chatgpt-team.site`. Os nomes dos remotes são convenções locais; isso não altera qual repositório o Cloudflare tem configurado.
- `git ls-remote github HEAD refs/heads/main` confirmou acesso ao GitHub. No início deste trabalho, ambos apontavam para `b47e494c38d6ac9b1ebc24af5a73cf561a5b6e81`, também presente localmente.
- A consulta ao GitHub confirmou que `pedrorodriguesdev/Linkei---Site-Afiliado` existe, está público no momento da consulta e tem `main` como branch padrão.
- A captura do Cloudflare vincula o projeto ao mesmo repositório esperado. O commit da última implantação bem-sucedida, `b47e494`, corresponde ao código que estava no GitHub e no checkout no início deste trabalho. Isso confirma uma implantação anterior bem-sucedida, mas não comprova que a conexão esteja saudável agora.
- Os deploys automáticos aparecem habilitados na captura; o aviso atual de desconexão pode impedir que um próximo push seja processado mesmo com essa opção ligada.
- Não há ferramenta conectada à conta Cloudflare nesta sessão. O acesso do nosso ambiente ao GitHub não comprova que o aplicativo Cloudflare também tenha acesso.

Não há evidência de que esse repositório tenha sido apagado ou transferido, e o nome exibido no vínculo do Cloudflare corresponde ao destino esperado. Permissão insuficiente do aplicativo, autorização interrompida ou instalação associada à conta errada continuam sendo possibilidades. Não há evidência suficiente para escolher uma como causa confirmada.

## Recuperação segura

Preserve o repositório e a implantação atual durante a conferência. Não é necessário alterar os remotes locais para autorizar o aplicativo Cloudflare.

1. No Cloudflare, abra **Workers & Pages** e selecione o projeto do Elevon.
2. Entre em **Settings → Builds** e localize **Git Repository**. Dependendo da versão do painel, a área pode aparecer como configurações de build ou integração Git.
3. Confira que o repositório vinculado é **pedrorodriguesdev/Linkei---Site-Afiliado**. Em **Branch control**, confirme **Production branch: main** e que os builds automáticos de produção estão habilitados.
4. Use **Manage** em **Git Repository** para inspecionar a instalação correspondente. Confirme que se trata da conta GitHub e da conta Cloudflare usadas para esse projeto.
5. No GitHub, abra [Settings → Applications → Installed GitHub Apps](https://github.com/settings/installations). Em **Cloudflare Workers and Pages**, clique em **Configure**. Confira a conta/organização da instalação e, em **Repository access**, autorize o repositório correto. Se usar **Only select repositories**, acrescente este repositório sem remover outros que já dependem dessa instalação. Salve a alteração. Permissões de uma organização podem exigir um administrador.
6. Volte ao Cloudflare, verifique se o aviso desapareceu e consulte **Deployments**. Abra a implantação mais recente e leia o log: erro de autorização/clone é diferente de erro durante `npm run build`.

As configurações de build deste projeto são:

| Campo | Valor |
| --- | --- |
| Branch de produção | `main` |
| Framework preset | `None` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | Vazio; o projeto está na raiz do repositório |
| Variável de ambiente | `NODE_VERSION=22` |

Se a instalação não aparecer, use o fluxo **Connect to Git / Add account** do Cloudflare para autorizar a conta correta. Não forneça senhas ou tokens em conversas.

A documentação oficial também descreve reinstalar o aplicativo como solução para erros persistentes de acesso. Essa não é a primeira ação aqui: desinstalar **Cloudflare Workers and Pages** revoga o acesso de todos os repositórios daquela instalação e pode interromper novos builds de outros projetos. Nenhuma permissão foi revogada ou reinstalada por esta sessão. Se a autorização normal não resolver, leve o erro exato ao suporte do Cloudflare antes de uma reinstalação de alcance geral.

## Se o repositório vinculado foi apagado, transferido ou está errado

Confirme o destino atual antes de mudar qualquer configuração. Se for necessário trocar o repositório de origem e o Pages não oferecer essa troca para o projeto existente, crie um **novo projeto Pages** conectado ao repositório correto, mantendo o projeto atual até validar o novo.

O novo projeto terá sua própria URL `*.pages.dev`, configurações de build, variáveis de ambiente e controles de deploy. Copie somente as configurações necessárias, teste o site e planeje separadamente a mudança de domínio personalizado. Uma troca de domínio pode exigir atualização de DNS e certificados. Não apague o projeto atual nem altere DNS antes dessa validação.

## Como comprovar que os deploys automáticos voltaram

Depois de corrigir as permissões, o próximo push legítimo para `main` deve iniciar uma nova implantação no Pages. A atualização do hero deste trabalho fornece um commit real para conferir; não é necessário criar um commit vazio só para testar.

Em **Deployments**, confirme:

- A implantação surgiu após o push, sem acionamento manual.
- A branch é `main` e o identificador do commit corresponde ao commit mostrado no GitHub.
- Clone e build terminaram com sucesso, e a URL publicada mostra a versão nova.

Um **Retry deployment** ajuda a testar o build e acesso do código, mas, sozinho, não comprova que o gatilho automático de novos pushes voltou. Se nenhum deploy surgir, confira novamente autorização, repositório, branch e controles de build; se surgir e falhar, use a etapa e a mensagem exatas do log.

## Referências oficiais e limite da consulta

- [Integração Git do Pages](https://developers.cloudflare.com/pages/configuration/git-integration/)
- [GitHub: acesso e reinstalação](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/#manage-access)
- [Configurações de build](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Limitações conhecidas do Pages](https://developers.cloudflare.com/pages/platform/known-issues/)

O site de documentação retornou HTTP 403 para este ambiente. As instruções foram conferidas no [repositório oficial `cloudflare/cloudflare-docs`](https://github.com/cloudflare/cloudflare-docs/tree/production/src/content/docs/pages), incluindo os arquivos de integração Git/GitHub, build e limitações. Isso permite orientar a recuperação, mas não substitui acesso autenticado à integração específica da conta.

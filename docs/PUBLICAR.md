# Publicar GymFlow com Node.js e PostgreSQL

[Publicar pelo navegador](https://render.com/deploy?repo=https://github.com/renataaap/gymflow/tree/work)

Não é necessário instalar nenhum programa no computador. O projeto usa React/TypeScript no navegador, Node.js no servidor e PostgreSQL para persistência.

## Primeira publicação

1. Abra o botão acima e entre no Render.
2. Conecte o repositório `renataaap/gymflow`. A origem deve ser a branch **work**.
3. Revise os dois recursos propostos:
   - `gymflow-node`: servidor web Node.js, que compila e serve o React.
   - `gymflow-postgres`: PostgreSQL 18 com armazenamento persistente próprio.
4. Confira os custos dos planos pagos configurados e confirme somente se concordar.
5. Aguarde o estado **Live** no serviço web. O endereço HTTPS é fornecido pelo Render.

A conexão `DATABASE_URL` é preenchida automaticamente pela referência ao banco. Migrações e seed idempotente são executados na inicialização. Senhas de banco não ficam no repositório, no bundle React nem no README.

O Blueprint usa nomes novos para preservar um eventual serviço anterior. Criar este novo ambiente não remove nem converte o serviço anterior; não exclua recursos antigos até verificar o novo ambiente e seus dados.

## Serviço existente

Se a hospedagem anterior foi criada como serviço de outro runtime, crie o novo serviço **Node** e um PostgreSQL. Alterar só o comando de início não é suficiente para trocar o ambiente antigo.

Para um serviço Node já existente, configure:

| Campo | Valor |
|---|---|
| Branch | `work` |
| Runtime | Node |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check | `/api/health` |
| NODE_ENV | `production` |
| GYMFLOW_DEMO | `1` |
| DATABASE_URL | conexão privada do PostgreSQL, como segredo |

A versão de Node vem de `.node-version` (24). Não adicione `GYMFLOW_DB`: essa variável pertencia à versão anterior e não é usada. Não é necessário montar disco no servidor web. Mantenha aplicativo e banco na mesma região.

O health check retorna `{"status":"ok","database":"postgresql"}` quando a conexão funciona. O servidor lê a porta do ambiente e escuta em `0.0.0.0`.

## Atualizar

Publicações automáticas estão desativadas. Depois de enviar o código, use **Manual Deploy → Deploy latest commit** no serviço. O banco permanece independente do servidor; migrações já aplicadas não são reaplicadas.

## Problemas comuns

- **O botão mostra código antigo:** confirme que a URL contém `/tree/work`.
- **DATABASE_URL ausente:** use o Blueprint ou configure a conexão privada do PostgreSQL no painel. Não publique a conexão no chat ou no GitHub.
- **Falha de conexão:** verifique região, hostname, usuário e regras de rede. Bancos externos podem exigir `DATABASE_SSL=require` e certificado válido. A verificação TLS não é desativada pelo código.
- **Banco vazio sem login:** com `GYMFLOW_DEMO=1`, uma base vazia recebe as contas fictícias. Para contas próprias, siga o bootstrap seguro descrito no README.
- **Dados de demonstração anteriores não aparecem:** esta versão cria um PostgreSQL novo; não importa automaticamente os arquivos da aplicação anterior.
- **Login não permanece:** abra a URL HTTPS oficial. Em produção, o cookie exige conexão segura.
- **Migração aplicada foi alterada:** não edite arquivos SQL aplicados. Crie outra migração com o próximo número.

## Referências

- [Blueprint e PostgreSQL no Render](https://render.com/docs/blueprint-spec)
- [Escolha da branch no botão de publicação](https://render.com/docs/deploy-to-render)

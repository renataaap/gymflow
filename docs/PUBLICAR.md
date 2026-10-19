# Publicar e usar sem instalar nada no computador

Acesse o GymFlow em qualquer navegador depois de publicar na hospedagem. O Python é executado pelo Render, não pelo seu computador. Os aplicativos e o banco continuam no servidor, com as mesmas permissões e regras de negócio.

## Publicar pela primeira vez

1. Abra [Publicar o GymFlow no Render](https://render.com/deploy?repo=https://github.com/renataaap/gymflow/tree/work).
2. Entre na sua conta Render. Se o repositório for privado, autorize o aplicativo do Render no GitHub para o repositório `renataaap/gymflow`.
3. Revise o Blueprint encontrado na branch `work`. A configuração cria um serviço web e um disco persistente de 1 GB. **São recursos pagos; confira e aprove os valores na sua conta antes de confirmar.** Esta alteração de código não criou serviços nem contratou um plano.
4. Confirme a criação e aguarde o estado **Live**.
5. Abra o endereço HTTPS exibido na página do serviço. Na tela do GymFlow, escolha Administrador, Professor ou Aluno para explorar os dados fictícios.

Não baixe o repositório e não execute comandos no seu computador. Python, versão, porta, inicialização, cookies HTTPS, teste de saúde e caminho do banco já estão configurados. O Render escolhe o domínio; o projeto não inventa nem fixa uma URL `onrender.com`.

A demonstração tem senhas públicas conhecidas, informadas na tela. Use apenas dados fictícios.

## Se você já criou um Web Service

Não crie outro serviço somente para aplicar esta configuração. Abra **Settings** do serviço existente e configure pelos campos do painel:

| Campo | Valor |
|---|---|
| Repository | `renataaap/gymflow` |
| Branch | `work` |
| Runtime | Python |
| Root Directory | deixe vazio |
| Build Command | `python -m compileall -q app` |
| Start Command | `python app/server.py --host 0.0.0.0 --seed-demo` |
| Health Check Path | `/api/health` |

Em **Environment**, adicione:

| Chave | Valor |
|---|---|
| GYMFLOW_DB | `/var/data/gymflow.sqlite3` |
| GYMFLOW_DEMO | `1` |
| GYMFLOW_SECURE_COOKIE | `1` |
| PYTHONUNBUFFERED | `1` |

Em **Disks**, crie um disco persistente de 1 GB, montado em `/var/data`. Discos exigem um plano compatível pago. Depois selecione **Manual Deploy → Deploy latest commit**. A porta vem automaticamente da variável `PORT` do Render; não é preciso preenchê-la.

Se havia dados em outro caminho, faça backup e migre o banco antes de mudar `GYMFLOW_DB`; trocar o caminho não move o arquivo existente. O seed só é executado quando não há usuários na base: uma nova implantação preserva o banco no disco persistente.

## Atualizações e verificação

O Blueprint mantém publicações automáticas desligadas, conforme a recomendação para botões de implantação. Depois de atualizar a branch, use **Manual Deploy → Deploy latest commit** para publicar quando decidir.

Os testes ficam no GitHub em **Actions → Verificar GymFlow**. Eles executam no servidor do GitHub, sem programas instalados no computador do usuário.

O caminho `/api/health` retorna somente `{"status":"ok"}` quando a base está acessível. O Render usa esse endpoint para verificar se a aplicação iniciou. Dados de alunos continuam protegidos por login na API.

## Problemas comuns

- **Nenhum Blueprint encontrado:** confirme que a origem é a branch `work`; o botão acima inclui essa seleção.
- **Repositório privado não aparece:** no GitHub, conceda acesso ao aplicativo oficial do Render para esse repositório.
- **Serviço sem porta aberta:** use o comando configurado acima. Ele escuta em `0.0.0.0` e lê `PORT` do Render.
- **Dados somem ao reiniciar:** confirme disco persistente e `GYMFLOW_DB=/var/data/gymflow.sqlite3`. O disco efêmero de um serviço sem volume não preserva SQLite entre implantações.
- **Login não mantém sessão:** abra a URL HTTPS fornecida pelo Render; os cookies da configuração hospedada exigem HTTPS.
- **Não deseja contratar hospedagem paga:** não confirme esse Blueprint. Esta configuração prioriza preservar o SQLite; uma publicação gratuita com persistência exigiria adaptar o banco para um serviço externo.

## Referências oficiais

- [Botão de implantação e escolha da branch](https://render.com/docs/deploy-to-render)
- [Configuração do Blueprint](https://render.com/docs/blueprint-spec)
- [Discos persistentes](https://render.com/docs/disks)
- [Versão do Python instalada pelo Render](https://render.com/docs/python-version)

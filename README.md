# GymFlow — Gestão em movimento

Aplicação web funcional para demonstração e avaliação de um sistema de academia. Identidade Athletic Tech Premium em preto, grafite e violeta; tipografia Inter e Space Grotesk hospedada junto do app. Sem verde.

O repositório recebido tinha somente um README. A aplicação foi construída do zero a partir dos dois textos; a identidade violeta do segundo texto prevalece. Não havia integrações ou dados anteriores para migrar.

## Usar pelo navegador — sem instalar Python

**Você não precisa instalar Python, Git, Node ou outro programa no computador.** A hospedagem instala e executa o servidor; você acessa o GymFlow por um endereço HTTPS.

[![Publicar no Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/renataaap/gymflow/tree/work)

1. Clique em **Publicar no Render** e entre ou crie sua conta.
2. Autorize o acesso ao repositório `renataaap/gymflow`, caso seja solicitado.
3. Revise os serviços e valores exibidos. A configuração inclui **serviço pago e disco persistente de 1 GB** para manter os cadastros após reiniciar.
4. Confirme a implantação no Render. Não é preciso preencher comandos ou variáveis: o arquivo `render.yaml` já os define.
5. Quando o serviço ficar **Live**, abra o endereço `https://…onrender.com` exibido pelo Render e escolha um perfil demonstrativo.

O botão seleciona a branch `work`, que contém a aplicação. O Python roda **somente no servidor**. Não há necessidade de terminal no seu computador. O endereço local `127.0.0.1` não é usado nesse fluxo.

A configuração publica uma **demonstração com dados fictícios e credenciais conhecidas**; não use essa base para dados reais. Atualizações de código não são publicadas automaticamente: no painel do serviço, use **Manual Deploy → Deploy latest commit** quando desejar atualizar. Consulte [o guia de publicação](docs/PUBLICAR.md) para solucionar problemas ou configurar um serviço já criado.

## Executar localmente (opcional, apenas para desenvolvimento)

Requisito: Python 3.12 ou superior, com SQLite. Nenhum pacote de aplicação precisa ser instalado.

```sh
python3 app/server.py --seed-demo
```

Abra **http://127.0.0.1:8000**. No Windows, use `py -3 app/server.py --seed-demo` ou `iniciar.bat`. Em macOS/Linux, também pode executar `./run.sh`.

O banco é criado em `work/gymflow.sqlite3`. `--seed-demo` só insere dados quando a tabela de usuários está vazia; reiniciar não apaga cadastros. O banco não está incluído no pacote: a demonstração começa em um estado reproduzível. A aplicação usa o fuso America/Sao_Paulo; em sistemas sem a base IANA, há fallback para UTC−03:00.

### Acessos fictícios

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | admin@gymflow.demo | GymFlow@2026! |
| Professor | professor1@gymflow.demo | GymFlow@2026! |
| Aluno | aluno1@gymflow.demo | GymFlow@2026! |

Os botões da tela de login preenchem essas credenciais e autenticam no servidor. Eles **não alteram o perfil** de uma sessão existente. Há também professor2/3 e aluno2 até aluno15; o aluno15 está inativo. O professor1 acompanha alunos3, 6, 9, 12 e 15. Para explorar uma mesma jornada, use professor1 + aluno3. Contas inativas não entram.

## Funcionalidades implementadas

- Login, sessão de 8 horas, logout, alteração de dados e senha com conferência da senha atual. Senhas derivadas com scrypt e salt; cookies HttpOnly e SameSite=Strict.
- Autorização em todas as operações do servidor. Administrador gerencia a academia; professor só recebe alunos atribuídos; aluno só recebe seus registros. O cliente não escolhe o papel de uma conta.
- Alunos e professores: criar, pesquisar, editar, reativar/desativar; professor responsável, nascimento, objetivo e autorização para avaliações. Desativação revoga sessões.
- Perfil do aluno com abas de informações, fichas, avaliações, frequência e financeiro (financeiro administrativo).
- Biblioteca de exercícios: criar, consultar instruções, editar e desativar. Busca por nome, equipamento ou nível e filtro por grupo muscular.
- Fichas com divisão A–G, séries, repetições, carga, intervalo, objetivo e orientações. Cada edição preserva a ficha anterior em um snapshot consultável.
- Aluno pode iniciar um treino, registrar carga e repetições por exercício, marcar execução e concluir a sessão. O histórico mantém os dados registrados, mesmo após editar a ficha. Rascunho da execução nesta aba em sessionStorage; registros concluídos são do banco.
- Avaliações: criar, editar, consultar histórico, gráfico de peso, medidas e próxima avaliação. Escrita exige autorização registrada no cadastro. A autorização é registrada manualmente pelo administrador após obtê-la do aluno.
- Check-in manual ou pelo próprio aluno, com data e hora do servidor. Restrição UNIQUE impede mais de um check-in por aluno no dia.
- Planos: criar, editar, desativar e vincular. Vincular gera uma assinatura e a primeira cobrança em uma transação; assinatura anterior fica no histórico.
- Cobranças adicionais pelo valor do plano, vencimentos, status vencido calculado em tempo real, pagamento manual e cancelamento de cobranças abertas. Uma cobrança já paga/cancelada não pode ser paga novamente.
- Dashboards por perfil, gráficos de receita, matrículas, frequência e distribuição de planos a partir de dados persistidos; filtros financeiros e CSV.
- Configurações da academia, alertas de cobranças vencidas e auditoria de operações. Sem filas ou envio de mensagens externas.
- Interface responsiva, menu lateral recolhível, navegação mobile, busca, filtros, ordenação alfabética, paginação, confirmações, validação e feedback. Modais com contenção de foco, Escape e respeito à preferência por movimento reduzido.

### Dados de demonstração

1 administrador, 3 professores, 15 alunos, 30 exercícios, 10 fichas, 45 avaliações, 3 planos, 15 assinaturas, histórico de presenças e pagamentos. Todos fictícios. Os totais exibidos refletem a base, sem KPIs inventados.

## Arquitetura e modelo

- `app/server.py`: servidor HTTP, autenticação, validações, RBAC, consultas e transações.
- `app/schema.sql`: banco relacional SQLite, versão inicial, chaves estrangeiras, índices, restrições e desativação lógica.
- `app/static/`: frontend HTML/CSS/JavaScript sem framework ou dependências externas em tempo de execução.
- `tests/test_api.py`: testes de integração em um banco temporário e isolado.
- `tests/browser_qa.py`, `tests/browser_flows.py`: verificação opcional da interface com Playwright e Chromium.

Entidades: users (identidade, perfil e dados básicos combinados), teachers, students, exercises, workouts, workout_exercises, workout_versions, workout_sessions, workout_logs, assessments, attendance, membership_plans, subscriptions, payments, notifications, audit_logs, sessions e settings. O modelo inclui o equivalente às entidades exigidas, com Users/UserProfiles reunidos.

Valores de cobranças são definidos pelo servidor, não aceitos do navegador. Operações relacionadas usam transações. Identificadores de aluno são verificados contra o perfil em cada escrita, e todas as leituras de registros pessoais são limitadas ao escopo da sessão. As senhas e tokens de sessão nunca são retornados pela API. O banco guarda somente o hash do token de sessão. CSRF, verificação de origem, cabeçalhos de segurança, limite de requisição e limitação de tentativas de login estão implementados.

## Testes

```sh
python3 -m unittest discover -s tests -p 'test_*.py' -v
node --check app/static/app.js
```

Os testes da API abrem um servidor em porta local temporária, criam e removem o próprio banco. Não alteram sua base. Node é usado apenas para checagem opcional do JavaScript, não para executar o app.

Testes de navegador requerem `playwright` e um Chromium já instalado. Primeiro execute o servidor com uma base **descartável** de demonstração. Em seguida:

```sh
python3 tests/browser_qa.py
python3 tests/browser_flows.py
```

Esses testes **criam registros** na base de demonstração. `GYMFLOW_TEST_URL` altera a URL (padrão `http://127.0.0.1:8000`) e `CHROMIUM_PATH` altera o executável (padrão `/usr/bin/chromium`). Capturas são gravadas em `work/`. Consulte `VALIDACAO.md` para resultados e limites.

## O que ainda depende de configuração ou não foi implementado

- A publicação pelo navegador foi preparada em `render.yaml`, mas a implantação na conta Render precisa ser concluída pelo titular no botão acima. Não há serviço Render ativo verificado nesta entrega. Não houve acesso a Base44/Lovable; o backend é Python/SQLite.
- IA indisponível: nenhum modelo conectado, nenhuma resposta simulada.
- E-mail/recuperação de senha indisponível: requer provedor e fluxo seguro de tokens, expiração e envio. Não há link de recuperação fictício.
- Gateway de pagamentos, webhooks, cobrança automática recorrente e QR Code não conectados. Cobranças são geradas manualmente e pagamentos são registros administrativos.
- Upload de fotos/vídeos não implementado; avatares usam iniciais. Não foram inventados vídeos demonstrativos de exercícios.
- Gráfico de evolução mostra peso; outros indicadores estão no histórico. Não há comparador arbitrário de dois intervalos, tempo de descanso regressivo ou prescrição por IA.
- LGPD: o campo de autorização e a restrição de acesso ajudam no fluxo, mas não substituem a definição da base legal, aviso de privacidade, processo de direitos dos titulares e política de retenção.
- Esta entrega é uma implementação demonstrável, com publicação configurada, não uma declaração de prontidão para operação com dados pessoais reais. O servidor padrão da biblioteca Python foi escolhido para execução sem instalação; para produção, use servidor e infraestrutura apropriados, HTTPS, backups verificados, observabilidade, revisão de segurança e gestão de acesso.

## Base vazia e administrador sem senha padrão

Use outro caminho de banco, sem `--seed-demo`. Em Linux/macOS:

```sh
export GYMFLOW_DB=/caminho/persistente/gymflow.sqlite3
export GYMFLOW_DEMO=0
python3 app/server.py --create-admin
python3 app/server.py
```

O comando solicita nome, e-mail e senha pelo terminal (senha não exibida) e só cria o administrador se ainda não existir um. `GYMFLOW_DEMO=0` oculta os acessos de demonstração e bloqueia o seed. Guarde o banco em volume persistente protegido. Para servir atrás de HTTPS, configure `GYMFLOW_SECURE_COOKIE=1`; o servidor permanece em loopback por padrão. `--host` e `--port` podem ser definidos explicitamente pelo operador.

As fontes Inter e Space Grotesk foram obtidas do repositório oficial Google Fonts. Licenças SIL OFL em `app/static/fonts/`.

# GymFlow — React, Node.js e PostgreSQL

Sistema web de gestão de academia, refeito em **React + TypeScript**, **Node.js + Express** e **PostgreSQL**. O projeto não usa runtime, scripts ou testes em Python. A identidade Athletic Tech Premium em preto, grafite e violeta foi mantida.

## Executar no computador

O projeto pode ser executado localmente, sem contratar hospedagem ou publicar um site. Requisitos: **Node.js 24**, npm e um banco **PostgreSQL** acessível.

1. Crie um banco PostgreSQL chamado `gymflow` e um usuário próprio, sem privilégios de superusuário, com permissão para criar as tabelas nesse banco.
2. Instale as dependências e copie o arquivo de configuração:

```sh
npm ci
cp .env.example .env
```

No PowerShell do Windows, use `Copy-Item .env.example .env` para copiar o arquivo.

3. Edite `DATABASE_URL` na `.env` com usuário, senha, endereço e porta do seu PostgreSQL. Mantenha `GYMFLOW_DEMO=1` para explorar os dados fictícios.
4. Inicie o projeto:

```sh
npm run dev
```

Abra **http://localhost:5173** no navegador. O Vite serve a interface React e encaminha as chamadas da API para o Node.js na porta 3000. A inicialização aplica as migrações e prepara os dados de demonstração automaticamente. Mantenha o terminal aberto durante o uso; pressione Ctrl+C para encerrar.

## Acessos da demonstração

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | admin@gymflow.demo | GymFlow@2026! |
| Professor | professor1@gymflow.demo | GymFlow@2026! |
| Aluno | aluno1@gymflow.demo | GymFlow@2026! |

Os botões autenticam contas reais da base demonstrativa, sem permitir trocar de papel numa sessão existente. Nesta versão, **professor1 acompanha aluno1**, aluno4, aluno7, aluno10 e aluno13. Há três professores e quinze alunos; aluno15 está inativo.

O modo de demonstração contém apenas dados fictícios e senhas conhecidas. Não o use para dados pessoais reais.

## Funcionalidades

- Autenticação com senha scrypt e salt, sessão de oito horas, cookie HttpOnly/SameSite e Secure em produção, proteção CSRF, verificação de origem e limite de tentativas de login.
- Três perfis: administrador, professor e aluno. Autorização no servidor e **Row Level Security (RLS) no PostgreSQL** para registros pessoais, treinos e finanças.
- Alunos e professores: criar, consultar, pesquisar, filtrar, editar, desativar e reativar. Vínculo de professor, nascimento, objetivo e autorização para avaliações. Desativar revoga sessões.
- Perfil do aluno em abas: visão geral, treinos, avaliações, frequência e financeiro administrativo.
- Biblioteca de exercícios: grupo muscular, categoria, equipamento, nível, execução e cuidados. Busca, filtro, edição e desativação.
- Fichas A–G com objetivo, orientações, séries, repetições, carga e intervalo. Edições preservam versões anteriores em JSONB.
- Aluno inicia um treino, registra execução e conclui a sessão. O histórico mantém os valores realizados após revisões da ficha. Cronômetro de descanso com pausa, continuação e reinício, destaque dos exercícios concluídos e aviso ao recuperar o rascunho. Rascunhos ficam somente na aba; sessões concluídas são persistidas no PostgreSQL.
- Avaliações com peso, altura, cintura, objetivo, observações, reavaliação e gráfico de evolução. Escrita exige autorização registrada no cadastro.
- Check-in com data/hora do servidor e restrição UNIQUE. Duas requisições simultâneas não duplicam a presença.
- Planos, assinaturas, geração manual de cobranças, pagamento manual, cancelamento e cálculo de vencidos. O valor é obtido do plano no servidor. Pagamento de uma cobrança já encerrada é bloqueado.
- Dashboards por perfil com dados persistidos, receita por mês, matrículas, frequência e distribuição de planos; exportação CSV, alertas e auditoria.
- Configurações da academia e perfil pessoal com alteração de senha mediante conferência da senha atual.
- Layout responsivo, menu recolhível, navegação mobile, tabelas com busca/filtro/ordenação/paginação, modais com foco contido, confirmação e feedback de erros.

Seed idempotente: 1 administrador, 3 professores, 15 alunos, 30 exercícios, 10 fichas, 45 avaliações, 3 planos, assinaturas, presenças e pagamentos. Reiniciar não apaga nem duplica a base.

## Banco PostgreSQL

As migrações versionadas ficam em `db/migrations/`:

- `001_initial.sql`: tabelas, relacionamentos, índices, validações, tipos monetários NUMERIC e funções de contexto.
- `002_row_security.sql`: políticas RLS para dados pessoais, finanças, fichas e execuções.

Entidades: users (identidade e perfil), teachers, students, exercises, workouts, workout_exercises, workout_versions, workout_sessions, workout_logs, assessments, attendance, membership_plans, subscriptions, payments, sessions, notifications, audit_logs, settings e schema_migrations.

As migrações usam lock transacional e checksum; uma migração já aplicada não pode ser alterada silenciosamente. Transações mantêm contexto de identidade com `set_config(..., true)`, que expira ao terminar a operação. Políticas são forçadas com `FORCE ROW LEVEL SECURITY`. Os testes utilizam um usuário PostgreSQL **sem SUPERUSER nem BYPASSRLS**. Acesso de inicialização é controlado exclusivamente pelo servidor.

Consultas usam parâmetros, respostas não expõem hashes e o cliente nunca recebe `DATABASE_URL`.

## Estrutura

```text
src/                  React + TypeScript, componentes e páginas
server/               API Express, autenticação, autorização e transações
db/migrations/        SQL e políticas do PostgreSQL
scripts/              Migrações, seed e verificações de navegador
tests/api.test.js     Integração com PostgreSQL real
public/fonts/         Inter e Space Grotesk com licenças SIL OFL
.github/workflows/    Build e testes no GitHub Actions
```

## Executar o build local

Para usar a interface compilada, com a mesma configuração `.env` e o PostgreSQL disponível:

```sh
npm run build
npm start
```

Abra **http://localhost:3000**. O Node.js serve o build em `dist/` e a API no mesmo endereço. Esses comandos não publicam o projeto.

`npm run db:migrate` aplica as migrações explicitamente. `npm run db:seed` exige `GYMFLOW_DEMO=1` e não altera bases que já têm usuários. Não coloque credenciais no Git.

### Base vazia com administrador próprio

Em uma base PostgreSQL nova, configure estas variáveis na sua `.env`:

```text
GYMFLOW_DEMO=0
INITIAL_ADMIN_NAME=Seu nome
INITIAL_ADMIN_EMAIL=Seu e-mail
INITIAL_ADMIN_PASSWORD=Uma senha exclusiva com pelo menos 12 caracteres
```

Guarde a senha somente na `.env` local, nunca em arquivos versionados. O administrador só é criado se a base estiver vazia. Depois da primeira inicialização, remova `INITIAL_ADMIN_PASSWORD` da `.env`. Desligar a demonstração numa base já preenchida não apaga contas demonstrativas: use uma base nova para operação real.

## Verificação

```sh
npm run build
npm test
```

Os testes iniciam **PostgreSQL 18 real** em diretório temporário, criam um usuário sem privilégios de bypass, aplicam migrações e validam API/RLS/persistência. O pacote `embedded-postgres` é dependência somente de desenvolvimento; não é SQLite nem um banco simulado. Ele baixa os binários PostgreSQL por npm e não modifica o PostgreSQL do operador.

A suíte e o build também estão configurados no GitHub Actions, sem necessidade de instalar ferramentas no computador do usuário.

Verificação visual opcional, com Chromium e Playwright instalados no ambiente de desenvolvimento:

```sh
node scripts/dev-instance.js
# Em outro terminal, usando a base descartável criada pelo comando acima:
npm run test:browser
```

O roteiro altera somente essa base descartável. `scripts/browser-flows.js` exercita formulários completos. Capturas ficam em `work/react-qa/`. Consulte [VALIDACAO.md](VALIDACAO.md).

## Limites da entrega

IA, envio de e-mail/recuperação de senha e gateway de pagamentos continuam indisponíveis e identificados como tal. Pagamentos são registros manuais. Não há prescrição automática, QR Code, uploads de fotos/vídeos ou cobrança recorrente por gateway. O gráfico físico acompanha peso; as outras medidas ficam no histórico.

Não houve migração automática dos arquivos de demonstração da versão anterior. Eles não foram publicados nem usados como dados reais. Histórico de código anterior permanece no Git.

Antes de operar com dados reais, defina base legal, privacidade, retenção, backups, recuperação de senha e revisão de segurança. O registro administrativo de autorização não substitui esse processo.

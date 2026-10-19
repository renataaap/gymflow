# Validação — GymFlow Node.js / React / PostgreSQL

Verificação local em 19/10/2026 com Node.js 24, React 19, TypeScript, Vite e PostgreSQL 18 real. O código e os testes da versão anterior foram substituídos; os resultados anteriores não foram reutilizados como validação desta implementação.

## Build

`npm run build`: checagem TypeScript estrita e build Vite aprovados. A interface é composta por componentes React; não utiliza execução de scripts do servidor anterior.

## API e banco — 13 testes aprovados

`npm test` cria uma instância PostgreSQL real e isolada, com usuário sem SUPERUSER e sem BYPASSRLS.

1. Migrações aplicadas, seed idempotente e quantidades demonstrativas corretas; respostas sem hashes de senha.
2. Administrador cria professor, aluno, plano, assinatura e cobrança; valor vem do plano, pagamento persiste e não pode ser registrado novamente.
3. Professor cria e revisa uma ficha com snapshot anterior e registra uma avaliação para aluno atribuído.
4. Aluno recebe somente seus dados; alteração de papel, cobrança e acesso a outro aluno são negados.
5. Consultas SQL diretas sob identidade de aluno/professor respeitam RLS; escrita para outro aluno é rejeitada pelo PostgreSQL. Conexão sem contexto não recebe avaliações.
6. Aluno conclui treino; carga registrada permanece no histórico depois da revisão da ficha.
7. Duas requisições simultâneas de check-in geram uma presença; CSRF inválido e origem externa são bloqueados.
8. Cadastro inválido não deixa usuário parcial; avaliação sem autorização é rejeitada.
9. Desativação revoga sessões e preserva pagamentos; logout encerra o acesso.
10. Outra conexão encontra os registros persistidos; configuração de produção emite cookie Secure/HttpOnly/SameSite.
11. O PostgreSQL é parado e reiniciado; os dados permanecem e o seed não duplica usuários.

12. Uma base PostgreSQL vazia cria um administrador exclusivo a partir de segredos de ambiente, sem usuários de demonstração e sem duplicar a conta ao reiniciar.
13. O comando real da hospedagem inicia o servidor, aplica migrações, lê PORT, serve o build React e encerra corretamente com SIGTERM.

Resultado final: **13/13 testes aprovados**.

## Navegador — dois roteiros aprovados

Os roteiros em `scripts/browser-test.js` e `scripts/browser-flows.js` foram executados com Chromium, frontend React, API Node e PostgreSQL real:

- Login em cada um dos três perfis e abertura dos módulos administrativos.
- Cadastro de professor e aluno, vínculo de plano, geração de cobrança e pagamento manual pela interface.
- Professor cria ficha, registra avaliação e revisa a ficha; versão anterior acessível.
- Aluno faz check-in, vê erro útil ao repetir, registra carga e conclui um treino pelo celular.
- Execução concluída acessível no histórico persistido.
- Desktop em 1440 × 1000 e mobile em 390 × 844, sem transbordamento horizontal dos dashboards.
- **Nenhum erro de JavaScript observado** nos dois roteiros.

Capturas foram geradas em `work/react-qa/`, somente com dados fictícios.

## Publicação

O Blueprint define um serviço Node.js e um PostgreSQL gerenciado, com conexão privada, criação de tabelas automática e health check. A estrutura foi conferida com a documentação do Render. Não foi provisionado um serviço pago nem validada uma URL hospedada na conta do usuário. A confirmação dos recursos ocorre no painel do Render.

## Limites

Testes funcionais não equivalem a pentest, auditoria jurídica de privacidade ou auditoria completa de acessibilidade. IA, recuperação por e-mail, gateway, QR Code e uploads não foram conectados nem simulados. A autorização de avaliação é um registro administrativo manual. Antes de usar dados reais, configure os serviços operacionais e a governança descritos no README.

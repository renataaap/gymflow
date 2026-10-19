# Validação da entrega

Verificação executada em 19/10/2026, em ambiente local Linux, Python 3.12.14 e Chromium. Contas e registros de teste são fictícios.

## API e banco — 10 testes aprovados

`python -m unittest discover -s tests -p 'test_*.py' -v`

1. Quantidades iniciais de dados demonstrativos e ausência de senhas na resposta.
2. Cadastro de professor e aluno, criação de plano, assinatura, cobrança, pagamento, bloqueio de pagamento repetido e persistência em outra sessão.
3. Aluno recebe somente seus registros; tentativas de acesso a outro aluno, criação de plano e escalada de perfil são negadas.
4. Professor recebe apenas alunos atribuídos; criação e revisão de ficha preservam snapshot; avaliação depende de autorização registrada.
5. Execução do aluno exige todos os exercícios e persiste carga e repetições.
6. Check-in exige CSRF, bloqueia outra origem e impede duplicação no dia.
7. Dados inválidos são rejeitados e a transação de cadastro é revertida sem deixar usuário parcial.
8. Desativação revoga acesso; logout invalida a sessão.
9. API protegida rejeita requisição sem autenticação.
10. Integridade do SQLite e chaves estrangeiras sem violações.

Resultado final: **10/10 aprovados**, em banco temporário isolado. `node --check app/static/app.js` e compilação Python também passaram.

## Navegador — fluxos reais aprovados

Executados por Playwright com o Chromium instalado, com servidor local e base descartável.

- Login em cada um dos três perfis.
- Abertura das páginas de administrador e dos formulários principais sem erros de JavaScript.
- Cadastro de professor e aluno pela interface.
- Vínculo de plano, geração automática da primeira cobrança e registro manual de pagamento com status Pago.
- Professor cria ficha para aluno atribuído, registra avaliação e revisa ficha com preservação da versão anterior.
- Aluno faz check-in, recebe erro útil ao tentar duplicar, registra carga e conclui um treino.
- Histórico de execução e versão anterior da ficha acessíveis após salvar.
- Capturas desktop em 1440 × 1000 e mobile em 390 × 844. Sem transbordamento horizontal da página nos dashboards de administrador e aluno. Tabelas usam rolagem contida.
- **Nenhum erro de JavaScript observado** nos dois roteiros.

Os roteiros estão em `tests/browser_qa.py` e `tests/browser_flows.py`. São verificações funcionais, não uma auditoria completa de acessibilidade ou um pentest. Foram exercitados desktop e celular; os breakpoints de tablet foram implementados, mas não tiveram um roteiro separado nesta entrega.

## Limites verificados e informados

Não houve publicação nem validação em infraestrutura pública. E-mail/recuperação de senha, IA, gateway, QR Code, uploads e cobrança recorrente automática não foram implementados ou simulados. O aplicativo informa indisponibilidade dos serviços. A persistência validada é SQLite no disco local, não Supabase ou banco hospedado.

As capturas mostram dados fictícios. A autorização de avaliações é um registro administrativo manual; não equivale, por si só, a um processo jurídico completo de consentimento. Consulte o README antes de utilizar dados reais.

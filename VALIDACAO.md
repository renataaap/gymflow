# Validação da entrega

Verificação executada em 19/10/2026, em ambiente local Linux, Python 3.12.14 e Chromium. Contas e registros de teste são fictícios.

## API, banco e hospedagem — 11 testes aprovados

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

11. Comando real de hospedagem testado em subprocesso: lê a porta `PORT`, cria o banco em diretório persistente configurável, responde ao health check sem expor dados, preserva alterações em duas reinicializações sem duplicar o seed e emite cookie com Secure, HttpOnly e SameSite=Strict no modo HTTPS.

Resultado final após preparar a publicação: **11/11 aprovados**, em bancos temporários isolados. `node --check app/static/app.js` e compilação Python também passaram.

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

## Publicação pelo navegador

Adicionados `render.yaml`, `.python-version`, botão de publicação no README e guia `docs/PUBLICAR.md`. O YAML foi lido e conferido localmente, com campos e seleção de branch consultados na documentação oficial do Render. A conta Render e o provisionamento do serviço não foram acessados; não foi executada validação autenticada do Blueprint no Render nem verificada uma URL hospedada. O plano pago e o disco são revisados e aprovados pelo usuário na hospedagem. O código inclui um workflow para executar a suíte no GitHub; a execução remota desse workflow depende do GitHub Actions e não foi verificada nesta entrega.

## Melhoria do treino — 21/10/2026

Adicionado cronômetro de descanso por exercício, com pausa, continuação, reinício e encerramento. O painel permanece visível ao rolar a ficha. Exercícios realizados recebem destaque e a retomada informa a recuperação do rascunho da aba. O cronômetro encerra ao fechar o treino; não envia notificações em segundo plano.

`python3 tests/browser_rest.py`: aprovado em viewport 390 × 844, sem erros de JavaScript. Verificados pausa, término, reinício, limpeza ao fechar, recuperação de carga e marcação, e largura do formulário. Os 11 testes de integração/hospedagem e a verificação de sintaxe JavaScript também passaram nesta rodada.

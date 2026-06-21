# Arquitetura

## Fase 1

Esta fase cria a fundação do monorepo, sem implementar fluxo de cotação, autenticação,
adapters reais ou automação de portais.

Decisões:

- Monorepo com `pnpm workspaces`.
- TypeScript em modo `strict`, com project references para apps e packages.
- API em Fastify por ser simples, leve e adequada para health checks e endpoints REST.
- Worker como processo Node separado, também com Fastify apenas para health check operacional.
- Prisma configurado com PostgreSQL, mas sem modelos de domínio nesta fase. Entidades e migrations
  ficam para a Fase 2.
- Redis configurado via `ioredis`; BullMQ é dependência do pacote de fila para as fases seguintes.
- Logs estruturados com Pino e redaction de campos sensíveis.
- Health checks de API, banco e Redis são testáveis por injeção de dependências mockadas.
- Carrier packages `carrier-a`, `carrier-b` e `carrier-c` existem apenas como placeholders de
  metadata mock. Nenhum adapter real ou acesso externo foi implementado.

## Fase 2

Esta fase adiciona domínio persistente e API sem implementar workers, fila real ou adapters.

Decisões:

- As entidades mínimas do MVP foram modeladas em Prisma com migration PostgreSQL inicial.
- Dinheiro usa `Decimal(12, 2)` no banco; cálculos monetários ficam para fases posteriores.
- Dados pessoais continuam minimizados: passageiros armazenam apenas data de nascimento.
- Autenticação usa JWT HMAC e hash de senha com `scrypt`, sem credenciais reais.
- O seed cria apenas operador e carriers de desenvolvimento (`carrier-a`, `carrier-b`, `carrier-c`).
- A criação de cotação cria `QuoteRequest`, `Traveler` e `CarrierExecution` em transação.
- A publicação de jobs é uma interface no-op nesta fase; BullMQ consumer e adapters mock ficam para a
  Fase 3.
- Retry cria uma nova execução auditável e preserva a execução anterior.

## Fase 3

Esta fase ativa a fila e o worker em modo mock, sem Playwright e sem portais externos.

Decisões:

- BullMQ usa a fila `carrier-executions`, com `jobId` estável por `carrierExecutionId`.
- A API publica um job por execução ao criar cotação ou retry.
- Cancelamento marca a cotação/execuções no banco e remove jobs ainda pendentes da fila.
- O worker consome jobs, carrega o adapter pelo registry e grava transições de estado.
- Os adapters `carrier-a`, `carrier-b` e `carrier-c` retornam planos mock determinísticos.
- Falha parcial é simulada por variáveis `CARRIER_A_MOCK_RESULT=fail`,
  `CARRIER_B_MOCK_RESULT=fail` ou `CARRIER_C_MOCK_RESULT=fail`.
- O status agregado da cotação é derivado das execuções: `COMPLETED`,
  `PARTIALLY_COMPLETED`, `FAILED`, `RUNNING` ou `CANCELLED`.
- O contexto de browser, artifacts e intervenção humana permanece no-op nesta fase.

## Fase 4

Esta fase adiciona a experiência web usando apenas a API e os adapters mock.

Decisões:

- A aplicação web é uma tela operacional única em Next.js, sem landing page.
- O login usa o endpoint `/api/v1/auth/login` e mantém o token apenas no estado do navegador.
- A criação de cotação usa os campos normalizados do MVP e seleciona `carrier-a`, `carrier-b` e
  `carrier-c`.
- O detalhe da cotação usa polling a cada 3 segundos enquanto o status não é terminal.
- O comparador ordena planos por preço, mas não recomenda plano.
- Exportação JSON/CSV é feita pela API com o token do operador.
- Para suportar o comparador, a API passou a retornar planos e coberturas normalizadas no detalhe da
  cotação.

## Fase 5

Esta fase prepara automação de navegador sem acessar portais reais.

Decisões:

- `browser-core` integra Playwright Chromium com contexto isolado por execução.
- Navegação é bloqueada por allowlist; em desenvolvimento/testes, `file://` é permitido para fixtures.
- Artifacts são gravados em disco por execução e marcados como sanitizados.
- Sanitização remove e-mails, tokens, cookies/headers comuns e valores de campos de senha.
- Fixtures locais vivem em `packages/test-fixtures/fixtures/carrier-a`.
- O runner de fixture do worker detecta formulário esperado, formulário alterado, resultado, sem
  resultados, erro de portal e CAPTCHA.
- CAPTCHA gera `HumanInterventionRequiredError`; não há tentativa de evasão.
- Os adapters mock da Fase 3 continuam sendo o fluxo principal do worker. O browser core está pronto
  para a próxima fase de adapters com fixtures, sem credenciais reais.

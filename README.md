# Travel Insurance Quote MVP

Fundação do monorepo para o MVP de cotação automatizada de seguro viagem.

## Pré-requisitos

- Node.js 22+
- pnpm 9+
- Docker
- Docker Compose plugin

Verifique se o Compose está disponível:

```sh
docker compose version
```

Se o comando acima retornar `unknown command`, instale o plugin do Compose. Em Fedora:

```sh
sudo dnf install docker-compose-plugin
```

## Instalação

```sh
pnpm install
cp .env.example .env
pnpm prisma:generate
pnpm db:migrate
pnpm db:seed
```

Os scripts locais usam `postgresql://postgres:postgres@localhost:5432/travel_quotes` como fallback
quando `DATABASE_URL` não estiver definida.

## Execução local

Subir PostgreSQL, Redis, API, worker e web:

```sh
docker compose up --build
```

Rodar os apps fora do Docker, usando PostgreSQL e Redis locais:

```sh
pnpm dev
```

URLs padrão:

- Web: http://localhost:3000
- API health: http://localhost:3001/health
- Worker health: http://localhost:3002/health
- OpenAPI: http://localhost:3001/api/v1/openapi.json

## Checks

```sh
pnpm lint
pnpm typecheck
pnpm test
```

Para executar os testes de browser da Fase 5, instale o Chromium do Playwright em um caminho gravável:

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/ms-playwright pnpm exec playwright install chromium
pnpm test
```

## Usuário de desenvolvimento

Depois de `pnpm db:seed`, existe um operador local sem credenciais reais:

- E-mail: `operador@corretora.test`
- Senha: `dev-password`

Login:

```sh
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"operador@corretora.test","password":"dev-password"}'
```

Criar cotação após obter o token:

```sh
curl -X POST http://localhost:3001/api/v1/quote-requests \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $TOKEN" \
  -d '{
    "originCountry": "BR",
    "destination": { "type": "COUNTRY", "countryCodes": ["PT", "ES"] },
    "departureDate": "2026-09-10",
    "returnDate": "2026-09-25",
    "tripPurpose": "LEISURE",
    "travelers": [{ "birthDate": "1995-05-17" }],
    "selectedCarrierIds": ["carrier-a", "carrier-b", "carrier-c"]
  }'
```

Na Fase 3, a API publica um job BullMQ para cada seguradora selecionada. O worker consome a fila e
persiste resultados mock normalizados para `carrier-a`, `carrier-b` e `carrier-c`.

Para simular falha parcial em desenvolvimento, defina uma variável de mock no serviço worker:

```env
CARRIER_B_MOCK_RESULT=fail
```

## Interface web

Com os containers ativos, abra:

```text
http://localhost:3000
```

A tela permite:

- login com o operador de desenvolvimento;
- criar cotação mock;
- acompanhar status por seguradora com polling;
- visualizar comparador de planos;
- cancelar cotação;
- retry de seguradora com falha;
- exportar JSON e CSV.

## Browser core

A Fase 5 usa apenas fixtures locais em `packages/test-fixtures/fixtures`. Não há acesso a portais
externos. O browser core suporta:

- contexto Chromium isolado;
- locale/timezone configuráveis;
- allowlist de navegação;
- screenshots e HTML snapshots sanitizados;
- detecção simulada de CAPTCHA/intervenção humana;
- testes contra fixtures locais.

## Estrutura

- `apps/api`: API Fastify e health check de processo, PostgreSQL e Redis.
- `apps/web`: app Next.js mínimo para a fundação.
- `apps/worker`: processo worker com health check operacional.
- `packages/domain`: tipos compartilhados de domínio.
- `packages/database`: cliente Prisma e health check de banco.
- `packages/queue`: conexão Redis e nomes de filas.
- `packages/browser-core`: contratos de sessão de browser, sem Playwright real nesta fase.
- `packages/carrier-sdk`: contratos para adapters futuros.
- `packages/carrier-a`, `carrier-b`, `carrier-c`: placeholders mock sem adapter real.
- `packages/observability`: logger Pino estruturado.
- `packages/test-fixtures`: pacote reservado para fixtures sanitizadas futuras.

## Segurança

Não use credenciais reais no repositório. `.env.example` contém apenas placeholders. O modo padrão
dos carriers é `mock`, e nenhuma automação de portal externo é executada nesta fase.

# MVP — Plataforma de Cotação Automatizada de Seguro Viagem

## 1. Objetivo do documento

Este documento define o escopo técnico e funcional de um MVP para automatizar cotações de **seguro viagem** em portais de **3 seguradoras**, com arquitetura preparada para expansão futura para até 5 seguradoras, outros produtos de seguro e integrações oficiais.

O documento foi escrito para ser usado como especificação por um agente de desenvolvimento, como o Codex CLI.

O MVP não deve tentar concluir a contratação ou efetuar pagamentos. Sua responsabilidade termina em:

1. Receber os dados da viagem e dos passageiros.
2. Executar cotações em múltiplas seguradoras.
3. Normalizar os resultados.
4. Apresentar os planos de forma comparável.
5. Registrar evidências, erros e histórico de execução.
6. Permitir intervenção humana quando houver CAPTCHA, MFA, bloqueio ou alteração inesperada no portal.

---

# 2. Visão do produto

## 2.1 Problema

Corretores de seguros precisam preencher repetidamente os mesmos dados em diferentes portais para comparar preços, coberturas e condições.

Esse processo é:

- repetitivo;
- demorado;
- sujeito a erros de digitação;
- difícil de auditar;
- dependente da estabilidade dos portais;
- pouco escalável.

## 2.2 Solução do MVP

Criar uma aplicação web que receba uma única solicitação de cotação e execute, por meio de workers de navegador, o mesmo processo em diferentes seguradoras.

Cada seguradora terá um adapter isolado que conhece:

- o endereço do portal;
- o fluxo de navegação;
- os campos do formulário;
- os formatos esperados;
- como iniciar a cotação;
- como interpretar os resultados;
- como identificar erros conhecidos.

## 2.3 Usuário inicial

O usuário principal do MVP é um corretor ou operador interno autorizado.

Não haverá inicialmente:

- acesso direto pelo consumidor final;
- emissão de apólice;
- pagamento;
- assinatura eletrônica;
- venda automática;
- recomendação automatizada baseada em perfil financeiro;
- integração com CRM;
- aplicativo móvel.

---

# 3. Princípios do projeto

1. **Fluxo normal determinístico**  
   A execução de uma cotação deve ser controlada por código e regras explícitas. IA não deve improvisar cada cotação.

2. **Um adapter por seguradora**  
   Alterações em uma seguradora não podem quebrar as demais.

3. **Nenhuma evasão de segurança**  
   CAPTCHA, MFA, rate limits, bloqueios e controles de acesso devem ser respeitados.

4. **Intervenção humana quando necessário**  
   O sistema deve poder pausar uma execução e solicitar ação do operador.

5. **Dados sensíveis minimizados**  
   Armazenar somente o necessário, pelo menor tempo possível.

6. **Auditoria desde o início**  
   Cada execução deve produzir logs estruturados e histórico de estado.

7. **Expansão gradual**  
   Primeiro 3 seguradoras. A quarta e a quinta devem ser adicionadas somente depois que a arquitetura estiver validada.

8. **Resultados normalizados**  
   O front-end e a API não devem depender do formato interno de nenhuma seguradora.

---

# 4. Escopo do MVP

## 4.1 Dentro do escopo

- Autenticação de operadores.
- Cadastro de uma solicitação de cotação.
- Viagem nacional ou internacional, conforme o suporte das seguradoras escolhidas.
- Um ou mais passageiros.
- Datas de ida e volta.
- Destino ou região.
- Faixa etária/data de nascimento dos passageiros.
- Seleção das seguradoras que participarão da cotação.
- Execução assíncrona de cotação.
- Automação via navegador com Playwright.
- Três adapters de seguradoras.
- Normalização dos planos encontrados.
- Comparação de preços e coberturas.
- Visualização do status da execução em tempo quase real.
- Cancelamento de uma cotação ainda não concluída.
- Retry manual de uma seguradora.
- Registro de erros.
- Screenshots sanitizados em falhas.
- Trace técnico por execução, com retenção limitada.
- Pausa para intervenção humana.
- Painel básico de operações.
- Exportação dos resultados em JSON e CSV.

## 4.2 Fora do escopo

- Compra ou emissão automática.
- Pagamentos.
- Gestão de comissões.
- Gestão completa de leads.
- CRM.
- Aplicativo móvel.
- Chatbot para consumidores.
- Recomendação jurídica, médica ou financeira.
- Uso de técnicas para burlar CAPTCHA.
- Rotação de identidade para esconder automação.
- Contorno de rate limits.
- Manipulação de fingerprint para simular usuários diferentes.
- Contratação sem revisão do corretor.
- Alteração automática de adapters em produção.
- Processamento de seguro auto, residencial, vida ou empresarial.

---

# 5. Hipóteses do MVP

1. A corretora possui autorização para acessar os portais utilizados.
2. As credenciais usadas pertencem à corretora ou a operadores autorizados.
3. Cada portal será avaliado individualmente quanto a termos de uso e permissões.
4. As três seguradoras iniciais serão definidas antes da implementação dos adapters.
5. O MVP será executado inicialmente para um número pequeno de operadores.
6. O volume inicial esperado é baixo ou moderado.
7. CAPTCHA e MFA serão tratados como etapas humanas.
8. A aplicação não garante preço final até que o corretor confirme a proposta no portal da seguradora.
9. Os valores apresentados podem ter prazo de validade.
10. A aplicação deve deixar claro quando um resultado foi extraído automaticamente e quando foi revisado por uma pessoa.

---

# 6. Stack sugerida

## 6.1 Linguagem

- TypeScript em modo estrito.

## 6.2 Backend

- Node.js.
- Fastify ou NestJS.
- Zod para validação de entrada e saída.
- Prisma como ORM.
- PostgreSQL.
- Redis.
- BullMQ para filas e jobs.

## 6.3 Automação

- Playwright.
- Chromium como navegador inicial.
- Contexto de navegador isolado por execução.
- Traces ativados em falhas e opcionalmente em ambiente de homologação.

## 6.4 Front-end

- Next.js.
- TypeScript.
- React.
- TanStack Query.
- Componentes acessíveis.
- Atualização de status via polling no MVP.
- WebSocket ou Server-Sent Events pode ser adicionado posteriormente.

## 6.5 Infraestrutura local

- Docker Compose.
- Serviços:
  - PostgreSQL;
  - Redis;
  - API;
  - worker;
  - front-end.

## 6.6 Testes

- Vitest.
- Playwright Test.
- Testcontainers ou banco isolado para integração.
- Fixtures HTML locais para testar parsers e locators sem acessar portais reais.

## 6.7 Observabilidade

- Logs estruturados com Pino.
- IDs de correlação.
- Métricas básicas.
- OpenTelemetry opcional após o MVP funcional.

---

# 7. Estrutura sugerida do repositório

Usar monorepo.

```text
travel-insurance-quote/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   └── test/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   └── worker/
│       ├── src/
│       └── test/
├── packages/
│   ├── domain/
│   ├── database/
│   ├── queue/
│   ├── browser-core/
│   ├── carrier-sdk/
│   ├── carrier-a/
│   ├── carrier-b/
│   ├── carrier-c/
│   ├── observability/
│   └── test-fixtures/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docs/
│   ├── architecture.md
│   ├── data-security.md
│   ├── adapter-development.md
│   └── operations-runbook.md
├── docker-compose.yml
├── AGENTS.md
├── .env.example
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

Usar `pnpm` para workspaces.

---

# 8. Arquitetura de alto nível

```text
Operador
   │
   ▼
Aplicação Web
   │
   ▼
API
   ├── autenticação
   ├── validação
   ├── persistência
   └── criação do job
          │
          ▼
        Redis
          │
          ▼
        Worker
          │
          ├── Carrier A Adapter
          ├── Carrier B Adapter
          └── Carrier C Adapter
                  │
                  ▼
              Playwright
                  │
                  ▼
        Portal autorizado da seguradora
```

## 8.1 Separação de responsabilidades

### API

Responsável por:

- autenticar o usuário;
- validar os dados;
- criar a solicitação;
- criar as execuções por seguradora;
- consultar resultados;
- cancelar execuções;
- disponibilizar arquivos exportados.

A API não deve controlar diretamente o navegador.

### Worker

Responsável por:

- consumir jobs;
- carregar o adapter;
- iniciar o navegador;
- executar o fluxo;
- atualizar o estado;
- salvar resultados;
- salvar evidências;
- tratar retries;
- interromper a execução quando necessário.

### Adapter

Responsável por:

- mapear dados normalizados para os campos do portal;
- navegar pelo fluxo;
- validar a página atual;
- interpretar planos;
- classificar falhas;
- retornar resultados normalizados.

### Front-end

Responsável por:

- coleta de dados;
- acompanhamento;
- comparação;
- retry;
- cancelamento;
- intervenção humana;
- exibição transparente de falhas.

---

# 9. Modelo de domínio

## 9.1 Solicitação de cotação

```ts
export type TravelQuoteRequest = {
  id: string;
  userId: string;
  originCountry: string;
  destination: TravelDestination;
  departureDate: string;
  returnDate: string;
  travelers: Traveler[];
  tripPurpose: TripPurpose;
  selectedCarrierIds: string[];
  createdAt: string;
};

export type TravelDestination = {
  type: "COUNTRY" | "REGION" | "WORLDWIDE";
  countryCodes?: string[];
  regionCode?: string;
};

export type Traveler = {
  id: string;
  birthDate: string;
};

export type TripPurpose =
  | "LEISURE"
  | "BUSINESS"
  | "STUDY"
  | "SPORTS"
  | "OTHER";
```

## 9.2 Resultado normalizado

```ts
export type NormalizedTravelPlan = {
  id: string;
  carrierId: string;
  carrierName: string;
  externalPlanId?: string;
  planName: string;
  currency: string;
  totalPrice: number;
  pricePerTraveler?: number;
  installmentOptions?: InstallmentOption[];
  coverages: NormalizedCoverage[];
  exclusionsSummary?: string[];
  assistanceServices?: string[];
  purchaseUrl?: string;
  externalQuoteReference?: string;
  validUntil?: string;
  collectedAt: string;
  rawResultReference?: string;
};

export type InstallmentOption = {
  installments: number;
  amount: number;
  total: number;
  interestFree?: boolean;
};

export type NormalizedCoverage = {
  code: CoverageCode;
  displayName: string;
  amount?: number;
  currency?: string;
  included: boolean;
  details?: string;
};

export type CoverageCode =
  | "MEDICAL_HOSPITAL"
  | "COVID_MEDICAL"
  | "DENTAL"
  | "PHARMACEUTICAL"
  | "BAGGAGE_LOSS"
  | "BAGGAGE_DELAY"
  | "FLIGHT_DELAY"
  | "TRIP_CANCELLATION"
  | "TRIP_INTERRUPTION"
  | "MEDICAL_TRANSFER"
  | "BODY_TRANSFER"
  | "LEGAL_ASSISTANCE"
  | "ACCIDENTAL_DEATH"
  | "PERMANENT_DISABILITY"
  | "OTHER";
```

## 9.3 Estado da solicitação

```ts
export type QuoteRequestStatus =
  | "DRAFT"
  | "QUEUED"
  | "RUNNING"
  | "PARTIALLY_COMPLETED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";
```

## 9.4 Estado da execução por seguradora

```ts
export type CarrierExecutionStatus =
  | "PENDING"
  | "QUEUED"
  | "STARTING"
  | "AUTHENTICATING"
  | "FILLING_FORM"
  | "SUBMITTING"
  | "READING_RESULTS"
  | "WAITING_HUMAN"
  | "SUCCEEDED"
  | "FAILED_RETRYABLE"
  | "FAILED_FINAL"
  | "CANCELLED";
```

---

# 10. Banco de dados

## 10.1 Entidades mínimas

### User

- id
- name
- email
- passwordHash ou providerId
- role
- active
- createdAt
- updatedAt

### QuoteRequest

- id
- userId
- originCountry
- destinationJson
- departureDate
- returnDate
- tripPurpose
- status
- createdAt
- updatedAt

### Traveler

- id
- quoteRequestId
- birthDate
- createdAt

### Carrier

- id
- slug
- name
- enabled
- adapterVersion
- createdAt
- updatedAt

### CarrierCredential

- id
- carrierId
- organizationId opcional
- encryptedPayload
- keyVersion
- status
- createdAt
- updatedAt

No MVP, credenciais podem ser fornecidas por variáveis de ambiente para desenvolvimento. Em produção, usar cofre de segredos. Nunca armazenar senha em texto puro.

### CarrierExecution

- id
- quoteRequestId
- carrierId
- status
- attempt
- startedAt
- finishedAt
- errorCode
- errorMessageSanitized
- currentStep
- externalQuoteReference
- adapterVersion
- createdAt
- updatedAt

### TravelPlan

- id
- carrierExecutionId
- carrierId
- externalPlanId
- planName
- currency
- totalPrice
- pricePerTraveler
- validUntil
- purchaseUrl
- rawResultJsonEncrypted ou rawResultReference
- collectedAt

### Coverage

- id
- travelPlanId
- code
- displayName
- amount
- currency
- included
- details

### ExecutionArtifact

- id
- carrierExecutionId
- type
- storageKey
- mimeType
- sanitized
- expiresAt
- createdAt

Tipos:

- SCREENSHOT
- TRACE
- HTML_SNAPSHOT
- DOM_SUMMARY
- RAW_RESPONSE
- LOG_EXCERPT

### AuditLog

- id
- userId
- action
- entityType
- entityId
- metadataJson
- createdAt

### HumanIntervention

- id
- carrierExecutionId
- type
- status
- instructions
- expiresAt
- resolvedByUserId
- resolvedAt
- createdAt

Tipos:

- CAPTCHA
- MFA
- SESSION_EXPIRED
- TERMS_CHANGED
- UNKNOWN_PAGE
- MANUAL_REVIEW

---

# 11. Regras de validação

## 11.1 Datas

- A data de ida deve ser futura.
- A data de volta deve ser posterior ou igual à data de ida.
- Limite inicial de duração: 365 dias.
- O limite deve ser configurável.
- Datas devem ser armazenadas em formato ISO.
- Regras dependentes de fuso devem usar um timezone explícito.

## 11.2 Passageiros

- Mínimo de 1 passageiro.
- Máximo configurável; iniciar com 10.
- Data de nascimento obrigatória.
- Não armazenar nome, CPF ou passaporte no MVP, a menos que um portal realmente exija esses dados para cotação.
- Se uma seguradora exigir mais dados, o adapter deve declarar essa necessidade antes da execução.

## 11.3 Destino

- Usar códigos ISO de países.
- Criar uma tabela interna de regiões.
- Cada adapter deve mapear o destino normalizado para as opções específicas do portal.

## 11.4 Valores

- Armazenar dinheiro em decimal ou unidade inteira de menor valor.
- Nunca usar `float` para cálculos monetários.
- Registrar moeda explicitamente.

---

# 12. API do MVP

Prefixo sugerido: `/api/v1`.

## 12.1 Autenticação

### `POST /auth/login`

Entrada:

```json
{
  "email": "operador@corretora.com",
  "password": "senha"
}
```

Saída:

```json
{
  "accessToken": "...",
  "user": {
    "id": "...",
    "name": "Operador",
    "role": "OPERATOR"
  }
}
```

## 12.2 Criar cotação

### `POST /quote-requests`

Entrada:

```json
{
  "originCountry": "BR",
  "destination": {
    "type": "COUNTRY",
    "countryCodes": ["PT", "ES"]
  },
  "departureDate": "2026-09-10",
  "returnDate": "2026-09-25",
  "tripPurpose": "LEISURE",
  "travelers": [
    {
      "birthDate": "1995-05-17"
    },
    {
      "birthDate": "1998-08-03"
    }
  ],
  "selectedCarrierIds": [
    "carrier-a",
    "carrier-b",
    "carrier-c"
  ]
}
```

Comportamento:

1. Validar entrada.
2. Criar `QuoteRequest`.
3. Criar uma `CarrierExecution` para cada seguradora.
4. Publicar os jobs.
5. Retornar `202 Accepted`.

## 12.3 Consultar cotação

### `GET /quote-requests/:id`

Retornar:

- dados da viagem;
- status geral;
- status por seguradora;
- planos normalizados;
- falhas sanitizadas;
- intervenções pendentes.

## 12.4 Listar cotações

### `GET /quote-requests`

Filtros:

- status;
- data inicial;
- data final;
- seguradora;
- usuário;
- paginação.

## 12.5 Cancelar

### `POST /quote-requests/:id/cancel`

Deve:

- marcar a solicitação;
- cancelar jobs ainda não iniciados;
- sinalizar workers ativos;
- fechar o navegador;
- registrar auditoria.

## 12.6 Retry de uma seguradora

### `POST /quote-requests/:id/carriers/:carrierId/retry`

Regras:

- somente execuções falhas ou expiradas;
- incrementar tentativa;
- não apagar a execução anterior;
- criar nova execução ou registrar novo attempt de forma auditável.

## 12.7 Resolver intervenção

### `POST /carrier-executions/:id/interventions/:interventionId/resolve`

A forma exata dependerá do tipo.

Para o MVP, duas opções são aceitáveis:

1. operador resolve no navegador remoto controlado;
2. operador marca a etapa como resolvida depois de executar a ação necessária.

Não enviar códigos MFA para logs.

## 12.8 Exportar

### `GET /quote-requests/:id/export?format=csv`

Formatos:

- CSV;
- JSON.

PDF fica fora do primeiro ciclo.

---

# 13. Contrato do adapter

Criar um pacote `carrier-sdk` com tipos comuns.

```ts
export interface TravelInsuranceCarrierAdapter {
  readonly metadata: CarrierMetadata;

  validateInput(
    input: TravelQuoteRequest
  ): Promise<AdapterInputValidationResult>;

  run(
    context: CarrierRunContext,
    input: TravelQuoteRequest
  ): Promise<CarrierRunResult>;
}

export type CarrierMetadata = {
  id: string;
  name: string;
  version: string;
  supportedDestinations: string[];
  maxTravelers: number;
  supportsMultiCountry: boolean;
  requiresAuthentication: boolean;
};

export type CarrierRunContext = {
  executionId: string;
  logger: StructuredLogger;
  browser: BrowserSession;
  artifacts: ArtifactCollector;
  cancellationSignal: AbortSignal;
  intervention: HumanInterventionGateway;
};

export type CarrierRunResult = {
  plans: NormalizedTravelPlan[];
  externalQuoteReference?: string;
  warnings: AdapterWarning[];
};
```

## 13.1 Fluxo interno recomendado

Cada adapter deve ser uma máquina de estados simples:

```text
START
  ↓
OPEN_PORTAL
  ↓
AUTHENTICATE, se necessário
  ↓
SELECT_DESTINATION
  ↓
FILL_DATES
  ↓
FILL_TRAVELERS
  ↓
SUBMIT
  ↓
WAIT_FOR_RESULTS
  ↓
PARSE_PLANS
  ↓
NORMALIZE
  ↓
VALIDATE_RESULT
  ↓
COMPLETE
```

## 13.2 Step interface

```ts
export interface AdapterStep<TContext> {
  readonly id: string;

  execute(context: TContext): Promise<StepResult>;
}

export type StepResult =
  | { type: "SUCCESS" }
  | { type: "RETRY"; reason: string }
  | { type: "WAITING_HUMAN"; interventionId: string }
  | { type: "FAILURE"; error: AdapterError };
```

## 13.3 Regras para selectors

Ordem de preferência:

1. `getByRole`.
2. `getByLabel`.
3. `getByPlaceholder`.
4. `getByText`, quando não for ambíguo.
5. atributos funcionais estáveis.
6. `data-testid`, quando o portal fornecer.
7. CSS específico como último recurso.

Não usar como principal estratégia:

- `nth-child`;
- classes geradas dinamicamente;
- XPath absoluto;
- coordenadas da tela;
- sleeps fixos longos.

## 13.4 Esperas

Preferir:

- auto-waiting do Playwright;
- esperar URL;
- esperar elemento visível;
- esperar estado específico;
- esperar resposta conhecida, quando permitido;
- timeout configurável.

Evitar `waitForTimeout`, exceto em casos documentados e temporários.

---

# 14. Pacote browser-core

Criar abstrações comuns:

```ts
export interface BrowserSession {
  page: Page;
  context: BrowserContext;

  captureFailureArtifact(input: {
    stepId: string;
    error: unknown;
  }): Promise<void>;

  close(): Promise<void>;
}
```

Responsabilidades:

- iniciar contexto isolado;
- configurar timezone e locale;
- bloquear domínios não permitidos;
- configurar downloads;
- mascarar logs;
- coletar screenshot;
- coletar trace;
- aplicar timeouts;
- encerrar processos órfãos;
- verificar cancelamento.

## 14.1 Allowlist de domínios

Cada adapter deve declarar:

- domínio principal;
- subdomínios permitidos;
- domínios de autenticação necessários;
- provedores externos estritamente necessários.

O worker deve bloquear navegação inesperada e registrar erro.

## 14.2 Downloads

No MVP, evitar depender de PDF ou arquivo baixado para interpretar o resultado. Se for inevitável:

- validar MIME type;
- limitar tamanho;
- salvar com nome gerado;
- nunca executar arquivos;
- aplicar retenção curta.

---

# 15. Tratamento de falhas

## 15.1 Taxonomia de erros

```ts
export type AdapterErrorCode =
  | "INVALID_INPUT"
  | "UNSUPPORTED_DESTINATION"
  | "UNSUPPORTED_TRAVELER_AGE"
  | "AUTHENTICATION_FAILED"
  | "SESSION_EXPIRED"
  | "CAPTCHA_REQUIRED"
  | "MFA_REQUIRED"
  | "RATE_LIMITED"
  | "PORTAL_UNAVAILABLE"
  | "NAVIGATION_TIMEOUT"
  | "ELEMENT_NOT_FOUND"
  | "FORM_CHANGED"
  | "VALIDATION_REJECTED"
  | "NO_PLANS_AVAILABLE"
  | "RESULT_PARSE_FAILED"
  | "UNEXPECTED_REDIRECT"
  | "CANCELLED"
  | "UNKNOWN";
```

## 15.2 Retry automático

Pode ocorrer para:

- timeout transitório;
- falha de rede;
- portal temporariamente indisponível;
- erro de carregamento;
- página incompleta.

Configuração inicial:

- máximo de 2 tentativas automáticas;
- backoff exponencial;
- jitter;
- não repetir automaticamente erros de autenticação;
- não repetir CAPTCHA;
- não repetir validação rejeitada;
- não repetir quando a execução foi cancelada.

## 15.3 Circuit breaker

Para cada seguradora:

- interromper novas execuções quando a taxa de falha ultrapassar um limite;
- permitir reativação manual;
- registrar o motivo;
- evitar bloqueio em massa de contas.

Implementar depois que os três adapters básicos estiverem funcionais, mas deixar a interface preparada.

---

# 16. Intervenção humana

## 16.1 Situações

- CAPTCHA.
- MFA.
- aceite de novo termo.
- sessão expirada.
- página não reconhecida.
- resultado ambíguo.
- portal solicitando informação fora do modelo do MVP.

## 16.2 Fluxo

```text
Worker identifica bloqueio
        ↓
Cria HumanIntervention
        ↓
Atualiza execução para WAITING_HUMAN
        ↓
Front-end exibe ação pendente
        ↓
Operador resolve
        ↓
Worker retoma ou reinicia a etapa
```

## 16.3 Limite temporal

- Intervenção expira após período configurável.
- Valor inicial sugerido: 10 minutos.
- Após expiração, marcar como falha retryable ou final conforme o caso.
- Não manter navegador aberto indefinidamente.

---

# 17. Detecção de mudança de formulário

A primeira versão não terá reparo automático por IA.

O MVP deve detectar indícios de alteração:

- campo esperado não encontrado;
- label diferente;
- quantidade de etapas diferente;
- URL inesperada;
- texto de erro desconhecido;
- tabela ou cards de resultado ausentes;
- cobertura obrigatória não encontrada;
- número de planos igual a zero após aparente sucesso.

## 17.1 Pacote de diagnóstico

Em caso de `FORM_CHANGED` ou `RESULT_PARSE_FAILED`, coletar:

```ts
export type FormChangeDiagnostic = {
  carrierId: string;
  adapterVersion: string;
  executionId: string;
  stepId: string;
  currentUrlSanitized: string;
  expectedElements: ExpectedElement[];
  visibleTextExcerptSanitized: string;
  accessibilitySummary: AccessibilityNodeSummary[];
  screenshotArtifactId?: string;
  traceArtifactId?: string;
  occurredAt: string;
};
```

## 17.2 Sanitização

Antes de persistir:

- remover nomes;
- remover e-mails;
- remover documentos;
- remover cookies;
- remover tokens;
- remover headers de autenticação;
- remover valores digitados;
- ocultar credenciais;
- limitar texto da página.

## 17.3 Evolução futura

Depois do MVP:

1. enviar diagnóstico sanitizado para um agente;
2. agente propõe patch declarativo;
3. validar patch por schema;
4. executar contra fixture;
5. executar em homologação;
6. exigir aprovação humana;
7. publicar como nova versão;
8. manter rollback.

Nunca permitir que um agente tenha acesso direto às credenciais.

---

# 18. Interface web

## 18.1 Tela de login

- e-mail;
- senha;
- mensagem genérica em falha;
- limite de tentativas;
- logout.

## 18.2 Nova cotação

Campos:

- origem;
- destino;
- data de ida;
- data de volta;
- finalidade;
- passageiros;
- seguradoras selecionadas.

Comportamentos:

- validação imediata;
- cálculo de idade apenas para exibição;
- confirmação antes de enviar;
- resumo dos dados.

## 18.3 Detalhe da cotação

Mostrar:

- status geral;
- progresso por seguradora;
- tempo decorrido;
- resultados conforme chegam;
- falhas;
- intervenções;
- botão de retry;
- botão de cancelar;
- exportação.

## 18.4 Comparador

Tabela com:

- seguradora;
- plano;
- preço total;
- preço por pessoa;
- assistência médica;
- bagagem;
- cancelamento;
- atraso de voo;
- traslado;
- serviços adicionais;
- validade da cotação;
- observações.

Permitir:

- ordenar por preço;
- ordenar por cobertura médica;
- filtrar cobertura mínima;
- expandir detalhes.

Não afirmar que um plano é “o melhor”. O sistema pode ordenar, mas não emitir recomendação personalizada no MVP.

## 18.5 Painel operacional

Mostrar:

- execuções em andamento;
- intervenções pendentes;
- falhas recentes;
- taxa de sucesso por seguradora;
- tempo médio;
- adapters ativos e versão;
- circuit breaker, quando implementado.

---

# 19. Segurança

## 19.1 Credenciais

- Nunca commitar credenciais.
- Usar `.env` somente em desenvolvimento.
- Criar `.env.example` sem valores reais.
- Em produção, usar secret manager.
- Criptografar credenciais persistidas.
- Restringir acesso ao worker.
- Não retornar credenciais pela API.
- Não mostrar credenciais no front-end.
- Não incluir credenciais em screenshots.

## 19.2 Dados pessoais

Para o MVP, usar somente:

- data de nascimento;
- dados da viagem;
- identificador interno do operador.

Evitar coletar:

- CPF;
- nome completo;
- passaporte;
- telefone;
- endereço;
- dados médicos.

Caso uma seguradora exija algum desses dados para uma simples cotação, revisar o escopo antes de implementar.

## 19.3 Retenção

Configuração inicial sugerida:

- logs operacionais: 30 dias;
- screenshots de falha: 7 dias;
- traces: 7 dias;
- dados de cotação: 90 dias;
- auditoria: conforme necessidade jurídica e política interna.

Todos os valores devem ser configuráveis.

## 19.4 Logs

Nunca registrar:

- senha;
- cookie;
- token;
- código MFA;
- documento;
- payload bruto sem sanitização;
- HTML completo com valores preenchidos.

## 19.5 Autorização

Papéis iniciais:

- `ADMIN`;
- `OPERATOR`;
- `VIEWER`.

Permissões:

| Ação | ADMIN | OPERATOR | VIEWER |
|---|---:|---:|---:|
| Criar cotação | Sim | Sim | Não |
| Ver resultados | Sim | Sim | Sim |
| Cancelar | Sim | Sim | Não |
| Retry | Sim | Sim | Não |
| Resolver intervenção | Sim | Sim | Não |
| Gerenciar seguradoras | Sim | Não | Não |
| Ver auditoria | Sim | Não | Não |

---

# 20. Observabilidade

Cada log deve incluir quando aplicável:

- `requestId`;
- `quoteRequestId`;
- `carrierExecutionId`;
- `carrierId`;
- `adapterVersion`;
- `stepId`;
- `attempt`;
- `durationMs`;
- `status`;
- `errorCode`.

## 20.1 Métricas

- cotações criadas;
- cotações concluídas;
- cotações parcialmente concluídas;
- taxa de sucesso por seguradora;
- duração por seguradora;
- falhas por código;
- retries;
- intervenções;
- quantidade de planos por execução;
- custo aproximado de infraestrutura por cotação.

## 20.2 Health checks

### API

- processo;
- banco;
- Redis.

### Worker

- processo;
- Redis;
- navegador disponível;
- espaço em disco para artifacts.

---

# 21. Testes

## 21.1 Unitários

Testar:

- validações;
- cálculo de idade;
- mapeamento de destino;
- normalização monetária;
- normalização de coberturas;
- classificação de erros;
- transições de estado;
- políticas de retry;
- sanitização.

## 21.2 Integração

Testar:

- criação de cotação;
- persistência;
- publicação de jobs;
- consumo do job;
- atualização de status;
- gravação de resultado;
- cancelamento;
- retry;
- exportação;
- autorização por papel.

## 21.3 Adapters com fixtures

Para cada seguradora, salvar fixtures sanitizadas:

```text
packages/test-fixtures/carrier-a/
├── quote-form.html
├── quote-form-changed.html
├── results.html
├── no-results.html
├── captcha.html
└── error.html
```

Criar testes que:

- localizem os campos;
- preencham a fixture;
- detectem CAPTCHA;
- interpretem resultados;
- normalizem coberturas;
- falhem de forma previsível em formulário modificado.

## 21.4 E2E da aplicação

Cenários:

1. Login.
2. Criar cotação.
3. Visualizar progresso.
4. Receber três resultados simulados.
5. Comparar planos.
6. Exportar CSV.
7. Simular uma seguradora falhando.
8. Fazer retry.
9. Cancelar cotação.
10. Resolver intervenção simulada.

## 21.5 Testes contra portais reais

- Executar apenas em ambiente autorizado.
- Usar conta de teste quando disponível.
- Baixo volume.
- Não rodar em CI pública.
- Não executar em paralelo sem necessidade.
- Não gerar compra.
- Não submeter dados falsos que possam produzir contratos ou registros indevidos.

---

# 22. Modo de desenvolvimento dos adapters

Criar dois modos.

## 22.1 Mock mode

- Não abre portal real.
- Usa fixtures.
- Retorna planos previsíveis.
- Deve ser o padrão em desenvolvimento e CI.

## 22.2 Live mode

- Requer flag explícita.
- Requer credenciais.
- Exibe aviso.
- Usa volume limitado.
- Salva artifacts sanitizados.
- Nunca ativado automaticamente em testes.

Variáveis:

```env
CARRIER_A_MODE=mock
CARRIER_B_MODE=mock
CARRIER_C_MODE=mock
```

---

# 23. Variáveis de ambiente

Criar `.env.example`:

```env
NODE_ENV=development

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/travel_quotes
REDIS_URL=redis://localhost:6379

API_PORT=3001
WEB_PORT=3000

JWT_SECRET=replace_me
ENCRYPTION_KEY=replace_me
ARTIFACT_STORAGE_PATH=./var/artifacts

PLAYWRIGHT_HEADLESS=true
PLAYWRIGHT_TIMEOUT_MS=30000
HUMAN_INTERVENTION_TIMEOUT_MS=600000

QUOTE_DATA_RETENTION_DAYS=90
ARTIFACT_RETENTION_DAYS=7
LOG_RETENTION_DAYS=30

CARRIER_A_ENABLED=true
CARRIER_A_MODE=mock
CARRIER_A_USERNAME=
CARRIER_A_PASSWORD=

CARRIER_B_ENABLED=true
CARRIER_B_MODE=mock
CARRIER_B_USERNAME=
CARRIER_B_PASSWORD=

CARRIER_C_ENABLED=true
CARRIER_C_MODE=mock
CARRIER_C_USERNAME=
CARRIER_C_PASSWORD=
```

---

# 24. Requisitos não funcionais

## 24.1 Confiabilidade

- Uma falha em uma seguradora não deve cancelar as outras.
- Uma cotação pode terminar como parcialmente concluída.
- Jobs devem ser idempotentes na medida do possível.
- Resultados não devem ser duplicados em retries.

## 24.2 Performance

Meta inicial:

- API comum: p95 inferior a 500 ms, sem contar automações.
- Atualização de status: visível em até 5 segundos.
- Execuções podem durar vários minutos.
- Limite de concorrência por seguradora configurável.

## 24.3 Escalabilidade

MVP:

- um serviço de API;
- um front-end;
- um ou poucos workers.

Preparar para:

- múltiplos workers;
- filas por seguradora;
- limite por credencial;
- isolamento por organização.

## 24.4 Compatibilidade

- Chrome/Chromium moderno para o front-end.
- Chromium no worker.
- Linux em produção.

---

# 25. Fases de implementação

## Fase 0 — Descoberta controlada

Objetivo: confirmar os fluxos antes de codificar adapters reais.

Tarefas:

1. Escolher as três seguradoras.
2. Registrar autorização e condições de acesso.
3. Mapear manualmente cada fluxo.
4. Listar campos obrigatórios.
5. Listar destinos e faixas etárias suportados.
6. Mapear formato dos resultados.
7. Identificar CAPTCHA, MFA e login.
8. Coletar fixtures sanitizadas.
9. Definir limites de concorrência.
10. Documentar riscos por seguradora.

Entregável:

- `docs/carriers/<carrier-id>.md` para cada seguradora.

Critério de aceite:

- fluxo completo documentado sem efetuar compra;
- campos e resultados conhecidos;
- decisão explícita sobre viabilidade.

## Fase 1 — Fundação do monorepo

Tarefas:

1. Criar workspace.
2. Configurar TypeScript estrito.
3. Configurar lint e format.
4. Criar API, web e worker.
5. Configurar PostgreSQL e Redis.
6. Configurar Prisma.
7. Criar Docker Compose.
8. Criar logging.
9. Criar health checks.
10. Criar CI para lint, typecheck e testes mock.

Critério de aceite:

- `docker compose up` inicia o ambiente;
- API e worker conectam;
- testes passam;
- nenhuma credencial real no repositório.

## Fase 2 — Domínio e API

Tarefas:

1. Implementar entidades.
2. Implementar migrations.
3. Implementar validação.
4. Implementar autenticação.
5. Implementar criação de cotação.
6. Implementar consulta.
7. Implementar cancelamento.
8. Implementar retry.
9. Implementar auditoria.
10. Criar documentação OpenAPI.

Critério de aceite:

- cotação pode ser criada e consultada;
- três execuções são geradas;
- estados persistem corretamente.

## Fase 3 — Fila e worker

Tarefas:

1. Criar filas.
2. Criar consumer.
3. Implementar estado da execução.
4. Implementar retry.
5. Implementar cancelamento.
6. Implementar limite de concorrência.
7. Implementar adapter registry.
8. Implementar adapters mock.
9. Salvar resultados mock.
10. Testar falha parcial.

Critério de aceite:

- uma cotação com três carriers produz resultados independentes;
- falha de um carrier não interrompe os outros.

## Fase 4 — Front-end

Tarefas:

1. Login.
2. Formulário.
3. Listagem.
4. Detalhe.
5. Status por seguradora.
6. Comparador.
7. Retry.
8. Cancelamento.
9. Exportação.
10. Estados de erro e carregamento.

Critério de aceite:

- fluxo completo funciona com adapters mock.

## Fase 5 — Browser core

Tarefas:

1. Integrar Playwright.
2. Isolar contextos.
3. Criar allowlist.
4. Criar artifact collector.
5. Criar timeout.
6. Criar cancellation signal.
7. Criar sanitização.
8. Criar trace em falha.
9. Criar mecanismo de intervenção.
10. Criar testes com fixtures.

Critério de aceite:

- worker abre fixture local, preenche e extrai resultado;
- falhas produzem artifacts sanitizados.

## Fase 6 — Primeiro adapter real

Tarefas:

1. Implementar fluxo.
2. Criar mapeamento de destino.
3. Criar mapeamento de passageiros.
4. Interpretar planos.
5. Normalizar coberturas.
6. Tratar erros conhecidos.
7. Criar fixtures.
8. Criar testes.
9. Executar teste autorizado de baixo volume.
10. Documentar runbook.

Critério de aceite:

- obter resultados reproduzíveis em cenário autorizado;
- nenhum passo de compra;
- erros classificados;
- dados sensíveis não aparecem nos logs.

## Fase 7 — Segundo e terceiro adapters

Repetir o processo do primeiro, sem copiar lógica específica para `browser-core`.

Critério de aceite:

- três seguradoras funcionam de forma isolada;
- pelo menos duas podem concluir simultaneamente;
- comparação normalizada é exibida.

## Fase 8 — Hardening do MVP

Tarefas:

1. Revisar segurança.
2. Revisar retenção.
3. Adicionar métricas.
4. Adicionar painel operacional.
5. Adicionar circuit breaker.
6. Testar falhas de rede.
7. Testar indisponibilidade.
8. Testar cancelamento.
9. Testar expiração de intervenção.
10. Fazer teste de recuperação.

Critério de aceite:

- checklist de lançamento concluído;
- runbook operacional existente;
- backup e restore testados;
- limites configurados.

---

# 26. Backlog priorizado

## P0 — Obrigatório

- monorepo;
- banco;
- Redis;
- autenticação;
- formulário;
- API de cotação;
- worker;
- adapters mock;
- três adapters reais;
- normalização;
- comparação;
- retry;
- cancelamento;
- artifacts;
- sanitização;
- intervenção humana;
- auditoria básica;
- testes principais;
- Docker Compose.

## P1 — Importante

- exportação CSV;
- métricas;
- painel operacional;
- circuit breaker;
- secret manager;
- storage externo de artifacts;
- notificação de intervenção;
- rate limiting da API.

## P2 — Pós-MVP

- quarto e quinto adapters;
- multiempresa;
- RBAC mais granular;
- agente de sugestão de reparo;
- API pública;
- integração CRM;
- relatórios;
- Open Insurance;
- emissão assistida;
- recomendações configuráveis.

---

# 27. Definition of Done

Uma tarefa só está concluída quando:

- código implementado;
- tipos corretos;
- lint passa;
- testes relevantes passam;
- erros tratados;
- logs estruturados;
- nenhuma informação sensível em logs;
- documentação atualizada;
- migration criada quando necessário;
- comportamento mock disponível para CI;
- critérios de aceite demonstráveis.

Para adapters reais:

- fixtures sanitizadas;
- testes de parser;
- teste de formulário modificado;
- timeout;
- cancelamento;
- classificação de erro;
- screenshot de falha sanitizado;
- runbook atualizado;
- autorização de teste confirmada.

---

# 28. Critérios de aceite do MVP completo

O MVP estará pronto quando:

1. Um operador conseguir entrar no sistema.
2. Conseguir criar uma cotação para uma viagem.
3. Selecionar três seguradoras.
4. O sistema executar os três jobs separadamente.
5. Cada seguradora retornar zero ou mais planos, ou uma falha claramente classificada.
6. Resultados concluídos aparecerem antes das demais execuções terminarem.
7. Uma falha não impedir outros resultados.
8. Os planos forem apresentados em modelo comparável.
9. O operador puder ordenar por preço.
10. O operador puder visualizar coberturas principais.
11. O operador puder refazer uma execução.
12. O operador puder cancelar uma cotação.
13. CAPTCHA ou MFA gerarem intervenção humana em vez de tentativa de evasão.
14. Mudança de formulário gerar diagnóstico.
15. Screenshots e traces não exibirem dados sensíveis conhecidos.
16. O ambiente local subir com Docker Compose.
17. Os testes mock passarem em CI.
18. Nenhuma compra ou emissão ocorrer automaticamente.
19. Logs permitirem rastrear uma execução.
20. Houver documentação para operar e corrigir cada adapter.

---

# 29. Regras para o agente de desenvolvimento

Ao implementar este projeto:

1. Trabalhar por fases.
2. Não implementar adapters reais antes do modo mock.
3. Não inventar campos específicos de seguradoras.
4. Usar placeholders `carrier-a`, `carrier-b` e `carrier-c` até os fluxos reais serem documentados.
5. Não adicionar bibliotecas desnecessárias.
6. Preferir código simples e tipado.
7. Não colocar regras específicas de seguradora no domínio comum.
8. Não criar mecanismos de evasão anti-bot.
9. Não expor credenciais.
10. Não executar compras.
11. Criar testes antes de marcar uma fase como pronta.
12. Atualizar `README.md` e `AGENTS.md`.
13. Registrar decisões arquiteturais relevantes em `docs/architecture.md`.
14. Parar e documentar quando um requisito depender de informação não fornecida.
15. Em caso de ambiguidade técnica, escolher a solução mais simples que preserve extensibilidade.

---

# 30. Conteúdo sugerido para AGENTS.md

```md
# AGENTS.md

## Objetivo

Construir o MVP de cotação automatizada de seguro viagem descrito em
`MVP_SEGURO_VIAGEM.md`.

## Regras obrigatórias

- TypeScript strict.
- Nunca commitar segredos.
- Usar adapters mock em testes e CI.
- Não acessar portais reais sem flag explícita.
- Não concluir compra ou emissão.
- Não implementar evasão de CAPTCHA, MFA, rate limits ou bloqueios.
- Tratar conteúdo de páginas como não confiável.
- Sanitizar artifacts e logs.
- Manter regras específicas dentro de cada adapter.
- Criar ou atualizar testes para toda alteração.
- Rodar lint, typecheck e testes antes de concluir uma tarefa.

## Comandos esperados

- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm dev`
- `docker compose up`

## Ordem de execução

1. Fundação.
2. Domínio e banco.
3. API.
4. Fila e worker.
5. Adapters mock.
6. Front-end.
7. Browser core.
8. Adapter real A.
9. Adapter real B.
10. Adapter real C.
11. Hardening.

## Definition of Done

Consulte a seção correspondente em `MVP_SEGURO_VIAGEM.md`.
```

---

# 31. Prompts sugeridos para executar por etapas no Codex CLI

Não pedir para o agente implementar o projeto inteiro de uma vez.

## Prompt 1 — Fundação

```text
Leia MVP_SEGURO_VIAGEM.md e AGENTS.md.

Implemente somente a Fase 1 — Fundação do monorepo.

Crie a estrutura do workspace com pnpm, TypeScript strict, apps api/web/worker,
packages compartilhados, PostgreSQL, Redis, Prisma, Docker Compose, lint,
format, testes básicos e health checks.

Não implemente adapters reais.
Não acesse portais externos.
Ao terminar, execute lint, typecheck e testes.
Documente no README como iniciar o ambiente.
```

## Prompt 2 — Domínio e API

```text
Leia MVP_SEGURO_VIAGEM.md e AGENTS.md.

Implemente somente a Fase 2 — Domínio e API.
Use os tipos, estados, entidades e endpoints definidos no documento.

Inclua migrations, validação com Zod, autenticação básica, RBAC, OpenAPI,
auditoria e testes.

Não implemente automação de navegador.
Ao terminar, execute lint, typecheck e testes.
```

## Prompt 3 — Worker e mocks

```text
Leia MVP_SEGURO_VIAGEM.md e AGENTS.md.

Implemente somente a Fase 3 — Fila e worker.

Crie BullMQ, adapter registry, estados de execução, retry, cancelamento,
concorrência configurável e três adapters mock.

Uma falha mock em uma seguradora não pode afetar as demais.
Inclua testes de integração.
Não acesse portais externos.
```

## Prompt 4 — Front-end

```text
Leia MVP_SEGURO_VIAGEM.md e AGENTS.md.

Implemente somente a Fase 4 — Front-end.

Crie login, nova cotação, listagem, detalhe, acompanhamento por seguradora,
comparador, retry, cancelamento e exportação.

Use somente a API e os adapters mock.
Inclua estados de loading, vazio, falha parcial e intervenção pendente.
```

## Prompt 5 — Browser core

```text
Leia MVP_SEGURO_VIAGEM.md e AGENTS.md.

Implemente somente a Fase 5 — Browser core.

Integre Playwright com fixtures locais.
Implemente isolamento, allowlist, timeout, cancelamento, artifacts,
sanitização, trace em falha e intervenção humana simulada.

Não acesse portais reais.
Crie testes para formulário normal, formulário modificado, CAPTCHA e resultado.
```

## Prompt 6 — Adapter real

```text
Leia MVP_SEGURO_VIAGEM.md, AGENTS.md e
docs/carriers/<carrier-id>.md.

Implemente somente o adapter <carrier-id> conforme o fluxo documentado.

Não invente seletores ou campos.
Use o modo mock como padrão.
O modo live deve exigir flag explícita.
Não concluir compra.
Não burlar CAPTCHA, MFA, rate limit ou bloqueios.

Crie fixtures sanitizadas, testes de parser, testes de mudança de formulário,
tratamento de erros, logs e runbook.
```

---

# 32. Primeira decisão prática

Antes de implementar qualquer adapter real, criar uma tabela de avaliação:

| Critério | Carrier A | Carrier B | Carrier C | Carrier D | Carrier E |
|---|---:|---:|---:|---:|---:|
| Cotação sem login |  |  |  |  |  |
| Login simples |  |  |  |  |  |
| CAPTCHA |  |  |  |  |  |
| MFA |  |  |  |  |  |
| Número de etapas |  |  |  |  |  |
| Resultado estruturado |  |  |  |  |  |
| Exige dados pessoais extras |  |  |  |  |  |
| Termos permitem automação |  |  |  |  |  |
| Conta de teste disponível |  |  |  |  |  |
| Estabilidade aparente |  |  |  |  |  |
| Prioridade |  |  |  |  |  |

Escolher as três primeiras com base em:

1. autorização;
2. simplicidade;
3. estabilidade;
4. baixa quantidade de dados pessoais;
5. clareza do resultado;
6. menor dependência de intervenção humana.

---

# 33. Resultado esperado ao final

Ao final do MVP, a corretora terá uma ferramenta interna capaz de:

- cadastrar uma única viagem;
- consultar três seguradoras;
- acompanhar o progresso;
- receber resultados independentes;
- comparar planos;
- identificar falhas;
- intervir quando necessário;
- manter histórico e auditoria;
- adicionar uma nova seguradora por meio de um adapter isolado.

A arquitetura estará pronta para evoluir, mas o MVP continuará deliberadamente limitado a cotação de seguro viagem e não executará contratação automática.

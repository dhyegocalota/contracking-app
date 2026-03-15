# Contracking — Design Spec

App pessoal para tracking de contrações durante trabalho de parto, com link público compartilhável com a médica.

## Stack

- **Monorepo**: Bun workspaces (sem Nx)
- **API**: Cloudflare Workers
- **Banco**: Cloudflare D1 (SQLite)
- **Frontend**: React 19 + Tailwind CSS
- **Auth**: Magic link (Resend + React Email)
- **Lint/Format**: Biome
- **Icons**: Lucide

## Estrutura do Monorepo

```
contracking-app/
├── apps/
│   ├── api/              # Cloudflare Worker
│   └── dashboard/        # React 19 + Tailwind
├── libs/
│   └── shared/           # Types, enums, constants
├── package.json          # Bun workspaces
├── tsconfig.base.json
└── biome.json
```

## Tema Visual

**Abyss** — OLED-black dark mode com acentos rosa quente.

- Background: `#09090f`
- Accent: `#d94d73` (rosa quente)
- Accent gradient: `linear-gradient(135deg, #b83a5e, #d94d73)`
- Glow do botão: `box-shadow: 0 0 60px rgba(185,58,94,0.25)`
- Cards: `rgba(255,255,255,0.02)` com border `rgba(255,255,255,0.04)`
- Textos: primary `0.85`, secondary `0.5`, muted `0.25`, faint `0.15`
- Border-radius: chips `10px`, cards `12-14px`, phone `24px`
- Transições: `all 0.2s ease`
- Suporte light/dark via `prefers-color-scheme`
- Light mode: fundo `#f8f7f5`, accent `#c94060`

## Autenticação

### Magic Link

1. Usuário entra email
2. API gera token + salva em D1 com expiração (15min)
3. Envia email via Resend com React Email (template visual consistente com app)
4. Usuário clica no link → API valida token → cria sessão (cookie httpOnly)
5. Sessões expiram em 30 dias

### Link Público

- Cada sessão de tracking tem UUID público
- URL: `/s/{sessionId}` — sem autenticação, read-only
- Atualiza em tempo real (polling ou SSE)

## Data Model

Todos timestamps em ISO 8601 UTC (ex: `2026-03-15T14:30:00.000Z`). IDs gerados com `crypto.randomUUID()`.

### Migrations

Migrations SQL em `apps/api/migrations/` com prefixo numérico (ex: `0001_init.sql`). Deploy via `bunx wrangler d1 migrations apply contracking --remote`.

### Tabelas D1

```sql
-- Usuários
users (
  id TEXT PRIMARY KEY,            -- UUIDv4
  email TEXT UNIQUE NOT NULL,
  name TEXT,                      -- nullable, opcional
  created_at TEXT NOT NULL         -- ISO 8601 UTC
)

-- Tokens de magic link
magic_link_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
)

-- Sessões de auth
sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
)

-- Sessões de tracking
tracking_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  public_id TEXT UNIQUE NOT NULL,
  patient_name TEXT,
  gestational_week INTEGER,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
)

-- Contrações
contractions (
  id TEXT PRIMARY KEY,            -- UUIDv4
  session_id TEXT NOT NULL,
  started_at TEXT NOT NULL,       -- ISO 8601 UTC
  ended_at TEXT,                  -- null enquanto ativa, preenchido ao parar
  intensity TEXT,                 -- nullable, ENUM: mild, moderate, strong
  position TEXT,                  -- nullable, ENUM: lying, sitting, standing, walking, squatting, ball
  notes TEXT,                     -- nullable, texto livre
  FOREIGN KEY (session_id) REFERENCES tracking_sessions(id) ON DELETE CASCADE
)

-- Eventos
events (
  id TEXT PRIMARY KEY,            -- UUIDv4
  session_id TEXT NOT NULL,
  type TEXT NOT NULL,             -- ENUM: water_break, meal, dilation, note
  value TEXT,                     -- ex: "4cm" pra dilatação, texto pra nota
  occurred_at TEXT NOT NULL,      -- ISO 8601 UTC
  FOREIGN KEY (session_id) REFERENCES tracking_sessions(id) ON DELETE CASCADE
)
```

## Tela Principal (Dashboard Privado)

### Header
- Título "Contracking"
- Subtítulo: "Semana {n} · {nome}"
- Botão `?` (instruções) + botão share (compartilhar link público)

### Status Bar
- 3 métricas: total contrações, duração média, intervalo médio
- Background sutil, border-radius 14px

### Botão Principal
- 140x140px, circular, gradient rosa
- **Idle**: texto "Iniciar", subtexto "Última contração há Xmin Xs"
- **Ativo**: mostra timer (00:00), subtexto "toque para parar", glow intensificado

### Campos Opcionais (abaixo do botão)
- **Intensidade**: 3 chips com barras crescentes (1 barra = leve, 2 = média, 3 = forte)
- **Posição**: 6 chips com ícones Lucide (bed-single, armchair, person-standing, footprints, arrow-down-to-line, circle)
- Todos chips: 38x38px, border-radius 10px, toggle on/off
- Acessíveis durante e após a contração
- Labels de 7px uppercase abaixo dos ícones

### Eventos
- Row compacta: 4 mini-chips (droplets=bolsa, utensils=refeição, ruler=dilatação, message-square=nota)
- 28px altura, border-radius 8px
- Ao clicar: bottom sheet com campo específico (ex: dilatação mostra input numérico 1-10cm)

### Timeline (Histórico)
- Header: "Histórico" + badge de regularidade (calculada automaticamente)
- Cada item: dot colorido (intensidade) + horário + detalhes (barras + texto + ícone posição) + duração + intervalo
- Background cards com hover sutil
- Scroll infinito

### Editar/Excluir Contrações
- Tap no item → bottom sheet com campos editáveis (intensidade, posição, horários, notas)
- Swipe left → botão "Excluir" com confirmação

### Modal de Instruções
- Acessível pelo botão `?` no header
- Aparece automaticamente na primeira abertura
- Passos: iniciar/parar, campos opcionais, eventos, compartilhar

## View Pública (Médica)

### URL: `/s/{publicId}`

### Header
- Título "Contracking"
- Subtítulo: "Sessão compartilhada · atualiza em tempo real"
- Badge "AO VIVO" com dot pulsante

### Info Paciente
- Tags compactas: nome, semana gestacional, horário de início da sessão

### Alerta Automático
- Detecta padrão 5-1-1 (contrações a cada 5min ou menos, durando 1min+, há pelo menos 1h)
- Card amarelo com ícone alert-triangle

### Stats
- Grid 4 colunas: total, duração média, intervalo médio, última dilatação

### Gráfico
- SVG com fill + line + dots
- Tabs: intervalo, duração, intensidade
- Labels de horário no eixo X
- Grid lines sutis

### Eventos
- Lista cronológica com ícone + texto + horário

### Timeline
- Mesma estrutura da tela principal (read-only)

### Atualização em Tempo Real
- Polling a cada 10 segundos (D1 não suporta websockets nativamente)

## API Endpoints

### Auth
- `POST /auth/magic-link` — envia magic link por email
- `GET /auth/verify?token={token}` — valida token, cria sessão
- `POST /auth/logout` — invalida sessão

### Tracking Sessions
- `POST /sessions` — cria nova sessão de tracking
- `GET /sessions` — lista sessões do usuário
- `GET /sessions/:id` — detalhes da sessão
- `PATCH /sessions/:id` — atualiza (nome paciente, semana)
- `DELETE /sessions/:id` — exclui sessão

### Contractions
- `POST /sessions/:id/contractions` — registra contração (início)
- `PATCH /contractions/:id` — atualiza (fim, intensidade, posição, notas)
- `DELETE /contractions/:id` — exclui contração

### Events
- `POST /sessions/:id/events` — registra evento
- `DELETE /events/:id` — exclui evento

### Public
- `GET /public/:publicId` — dados completos da sessão (read-only, sem auth)
- `GET /public/:publicId/poll?after={timestamp}` — polling incremental (timestamp em ISO 8601 UTC, retorna apenas contrações e eventos criados/atualizados após o timestamp; resposta vazia = `{ contractions: [], events: [] }`)

## Shared Types (libs/shared)

```typescript
enum Intensity {
  MILD = 'mild',
  MODERATE = 'moderate',
  STRONG = 'strong',
}

enum Position {
  LYING = 'lying',
  SITTING = 'sitting',
  STANDING = 'standing',
  WALKING = 'walking',
  SQUATTING = 'squatting',
  BALL = 'ball',
}

enum EventType {
  WATER_BREAK = 'water_break',
  MEAL = 'meal',
  DILATION = 'dilation',
  NOTE = 'note',
}
```

## Response DTOs (libs/shared)

```typescript
interface SessionResponse {
  session: TrackingSession;
  contractions: Contraction[];
  events: Event[];
  stats: SessionStats;
}

interface SessionStats {
  totalContractions: number;
  averageDuration: number;       // segundos
  averageInterval: number;       // segundos
  regularity: 'regular' | 'irregular' | null;
  alertFiveOneOne: boolean;
  lastDilation: string | null;
}

interface PollResponse {
  contractions: Contraction[];
  events: Event[];
  stats: SessionStats;
}
```

## Regras de Negócio

### Regularidade Automática
- Calculada após cada nova contração finalizada
- Requer no mínimo 6 contrações finalizadas (5 intervalos)
- Se < 6 contrações: `null` (não exibe badge)
- **Regular**: desvio padrão dos últimos 5 intervalos < 2min
- **Irregular**: desvio padrão >= 2min

### Alerta 5-1-1
- Recalculado após cada contração finalizada
- Condições (todas devem ser verdadeiras):
  1. Intervalo médio das últimas 5 contrações ≤ 5min
  2. Duração média das últimas 5 contrações ≥ 1min
  3. Primeira das últimas 5 contrações começou há ≥ 1h
- Mostra alerta na view pública e na tela principal

### Duração/Intervalo Médios
- Calculados sobre as últimas 10 contrações finalizadas (ou todas se < 10)

### Link Público
- Nunca expira enquanto a sessão existir
- Usuário pode gerar novo `publicId` (invalida link anterior)
- Polling na view pública: 10s enquanto tab ativa, pausa quando tab inativa (Page Visibility API)

### Rate Limiting
- Magic link: máx 3 envios por email a cada 15min
- API geral: 60 req/min por IP

### Editar/Excluir
- Tap no item da timeline → bottom sheet com campos editáveis + botão "Salvar"
- Swipe left → botão "Excluir" com confirmação ("Excluir contração das {horário}?")
- DELETE em tracking_sessions faz CASCADE em contractions e events

# Game Star — Game SPA (Play)

Vue 3 + Phaser 3 SPA: **Login**, **Admin**, and a full-screen **Play** route. The app uses the API to load control/consume state, record fine-grained create events, and update control progress.

## Prerequisites

- **Node.js 24+** (see `package.json` `engines`)
- Game Star [Developers Edition](https://github.com/agile-learning-institute/star/blob/main/CONTRIBUTING.md)
- Developer [SPA Standard Prerequisites](https://github.com/agile-learning-institute/star/blob/main/DeveloperEdition/standards/spa_standards.md)

## Quick Start

```sh
npm run service
```

## Developer Commands

```sh
npm install
npm run build
npm run dev

npm run test
npm run test:coverage
npm run test:ui

npm run cypress
npm run cypress:run
npm run test:e2e:game   # Playwright play E2E

npm run api
npm run service
npm run open
npm run container
```

## Routes

- **`/`** — Redirects to `/play` (or `/login` if unauthenticated).
- **`/login`** — Sign-in gate (IdP or URL hash → `localStorage`; see `bootstrap-auth.ts`).
- **`/play`** — Full-screen Phaser play (user's most recent control).
- **`/play/:game_id`** — Full-screen play for a specific control (e.g. launch by another microservice).
- **`/admin`** — Admin page (requires `admin` role).

No navigation drawer; app bar shows product name (Game Star), Admin (if admin), and Logout.

## API: Control / Create / Consume

Entity names and paths come from the template merge (e.g. Control, Create, Consume). Endpoints: `GET /api/control`, `GET /api/create`, `GET /api/consume` (and by-id, POST/PATCH as per domain). Consume id comes from `config.token.user_id` (or `config.token.claims.sub`). Placeholder "my control" flow: `GET /api/control?name={user_id}`, pick latest. Create: `POST /api/create` with body `{ player_id, name }` (name = one-word slug).

See `src/api/types.ts` and `src/api/client.ts` for types and methods.

## Play (Phaser) Flow

1. **GamePage.vue** loads config, control (most recent or by `game_id` from route), and consume.
2. It builds an **apiContext** (controlId, consumeId, control, consume, `recordCreate`, `updateControlProgress`) and passes it into the Phaser bootstrap.
3. **MainScene** uses the context: on click/tap they call `recordCreate({ player_id, name: 'move' })` and, every N actions, `updateControlProgress(patch)`.
4. Overlay shows consume name and control progress. On API failure, an error overlay with Retry is shown.

## Architecture

```
src/
  api/           # Control/Create/Consume types and client (from template)
  game/          # Phaser bootstrap, apiContext, scenes (e.g. MainScene)
  pages/         # LoginPage, AdminPage, GamePage
  composables/   # useAuth, useConfig, useRoles
  stores/        # UI state
  router/        # /login, /play, /play/:game_id, /admin
  plugins/       # Vuetify
```

## Testing

- **Unit** — Vitest: `npm run test`. Covers API client (Control/Create/Consume) and composables.
- **E2E — Cypress** — Login, redirect to `/play`, play container, admin, logout. `npm run cypress` or `npm run cypress:run`.
- **E2E — Playwright** — Play screen: unauthenticated redirect; with mocked API, play container and canvas visible. `npm run test:e2e:game`. See [Playwright documentation](https://playwright.dev/docs/intro).

## Technology Stack

- Vue 3, TypeScript, Vite 7, Vuetify 3, Vue Router, Pinia, TanStack Query
- Phaser 3
- Vitest (unit), Cypress (E2E), Playwright (E2E play)

## Configuration

- Config: `/api/config`. Consume id from `config.token.user_id` (or `config.token.claims`).
- Dev proxy: `/api` → `http://localhost:8389`.
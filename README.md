# template_spa (Game)

Vue 3 + Phaser 3 SPA: **Login**, **Admin**, and a full-screen **Game** route. The game uses the API to load player/game state, record fine-grained events, and update game progress.

## Prerequisites

- Mentor Hub [Developers Edition](https://github.com/agile-learning-institute/mentorhub/blob/main/CONTRIBUTING.md)
- Developer [SPA Standard Prerequisites](https://github.com/agile-learning-institute/mentorhub/blob/main/DeveloperEdition/standards/spa_standards.md)

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
npm run test:e2e:game   # Playwright game E2E

npm run api
npm run service
npm run open
npm run container
```

## Routes

- **`/`** — Redirects to `/play` (or `/login` if unauthenticated).
- **`/login`** — Login (uses `/dev-login`; JWT in localStorage).
- **`/play`** — Full-screen Phaser game (user’s most recent game).
- **`/play/:game_id`** — Full-screen game for a specific game (e.g. launch by another microservice).
- **`/admin`** — Admin page (requires `admin` role).

No navigation drawer; app bar has title “Game”, Admin (if admin), and Logout.

## API: Game / Event / Player

- **Player** — `playerId` comes from `config.token.user_id` (or `config.token.claims.sub`). Endpoints: `GET /api/player`, `GET /api/player/:id`.
- **Game** — `GET /api/game` returns the user’s most recent game; `GET /api/game/:id` for a specific game. Progress is updated via `PATCH /api/game/:id` (e.g. `description` or other minimal fields; document any new progress fields here).
- **Event** — Fine-grained events: `POST /api/event` with body `{ player_id, name }` where `name` is a one-word slug (e.g. `move`, `jump`).

See `src/api/types.ts` and `src/api/client.ts` for types and methods.

## Game (Phaser) Flow

1. **GamePage.vue** loads config, game (most recent or by `game_id` from route), and player.
2. It builds an **apiContext** (playerId, gameId, player, game, `recordEvent`, `updateGameProgress`) and passes it into the Phaser bootstrap.
3. **MainScene** (and any other scenes) use the context: on click/tap they call `recordEvent({ player_id, name: 'move' })` and, every N actions, `updateGameProgress(patch)`.
4. Overlay shows player name and game progress (e.g. `game.description`). On API failure, an error overlay with Retry is shown.

## Architecture

```
src/
  api/           # Game/Event/Player types and client
  game/          # Phaser bootstrap, apiContext, scenes (e.g. MainScene)
  pages/         # LoginPage, AdminPage, GamePage
  composables/   # useAuth, useConfig, useRoles
  stores/        # UI state
  router/        # /login, /play, /play/:game_id, /admin
  plugins/       # Vuetify
```

## Testing

- **Unit** — Vitest: `npm run test`. Covers API client (Game/Event/Player) and composables.
- **E2E — Cypress** — Login, redirect to `/play`, game container, admin, logout. `npm run cypress` or `npm run cypress:run`.
- **E2E — Playwright** — Game screen: unauthenticated redirect; with mocked API, game container and canvas visible. `npm run test:e2e:game`. See [Playwright documentation](https://playwright.dev/docs/intro).

## Technology Stack

- Vue 3, TypeScript, Vite 7, Vuetify 3, Vue Router, Pinia, TanStack Query
- Phaser 3
- Vitest (unit), Cypress (E2E non-game), Playwright (E2E game)

## Configuration

- Config: `/api/config`. `playerId` from `config.token.user_id` (or `config.token.claims`).
- Dev proxy: `/api` and `/dev-login` → `http://localhost:8389`.

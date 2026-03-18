# Refactor Plan: Vue Phaser Template → Game/Event/Player + Phaser 2D

Refactor the sample SPA from Control/Create/Consume domains to **Game** / **Event** / **Player**, add a Phaser 2D game experience, and keep auth/security unchanged.

UI scope change: keep **only** the login support, the **admin** route, and a **full-screen default game** route. Remove the CRUD pages and the navigation drawer; the Phaser game should directly use the API to retrieve/update game progress, record events, and display player information.

---

## 1. Domain mapping

| Current (sample) | New (game) | API path   | CRUD supported by API (UI minimal) |
|------------------|------------|------------|---------------------------|
| **Control**      | **Game**   | `/game`    | List, New, Edit (full CRUD) |
| **Create**       | **Event**  | `/event`   | List, New, View (no edit)   |
| **Consume**      | **Player** | `/player`  | List, View only            |

- **Game**: API supports full CRUD (list, create, update); UI demo uses a subset to show/update progress.
- **Event**: API supports list/create/view; UI demo uses it to record gameplay events.
- **Player**: API supports list/view; UI demo uses it to display player info.

---

## 2. Security (unchanged)

- **Login**: Keep `LoginPage.vue` and `useAuth`; continue using `/dev-login` and storing `access_token`, `token_expires_at`, `user_roles` in localStorage.
- **Guards**: Same `meta.requiresAuth` and `meta.requiresRole` in router; only update default/fallback route names (e.g. redirect to `/play` instead of `Controls`).
- **API client**: Keep Bearer token and 401 → clear token + redirect to `/login?redirect=...`.
- **Admin**: Keep `/admin` and `requiresRole: 'admin'`; no change to role checks.

---

## 3. Phase 1: Domain rename (Control → Game, Create → Event, Consume → Player) + UI scope reduction

### 3.1 Router (`src/router/index.ts`)

- Default route: `/` → `/play` (full-screen game).
- Keep login route exactly as-is:
  - `/login` (meta: `requiresAuth: false`)
- Keep admin route exactly as-is:
  - `/admin` (meta: `requiresAuth: true`, `requiresRole: 'admin'`)
- Add authenticated game route(s):
  - `/play` (meta: `requiresAuth: true`) — default: load user’s most recent game
  - `/play/:game_id` (meta: `requiresAuth: true`) — for launch by another microservice (e.g. production)
- Remove routes for:
  - `/controls`, `/controls/new`, `/controls/:id`
  - `/creates`, `/creates/new`, `/creates/:id`
  - `/consumes`, `/consumes/:id`
- Document title: e.g. “Game” or product name instead of “Sample” (optional).

### 3.2 API layer

**`src/api/types.ts`**

- Rename: `Control` → `Game`, `ControlInput` → `GameInput`, `ControlUpdate` → `GameUpdate`.
- Rename: `Create` → `Event`, `CreateInput` → `EventInput`.
- Rename: `Consume` → `Player`.
- **Event (POST)** shape: `{ player_id: string, name: string }` — `name` is a non-unique short one-word slug (e.g. `move`, `jump`).
- **Game progress**: use `updateGame(gameId, patch)`; any new fields added for progress (e.g. `score`, `tokens`) should be minimal and **documented in README.md** so they can be removed or adjusted later.
- Backend shape changes: keep minimal; document any new/removed fields specifically so they are removable.

**`src/api/client.ts`**

- Imports: use new type names.
- **Game**:
  - `GET /game` — returns the user’s **most recent game** (default for `/play`).
  - `GET /game/:game_id` — load a specific game (used when launched with `game_id`, e.g. by another microservice in production).
  - `getGames`, `getGame(id?)`, `createGame`, `updateGame` (patch for progress).
- **Event**:
  - `POST /event` with body `{ player_id, name }`; `createEvent(payload)`.
- **Player**:
  - `getPlayers`, `getPlayer(id)`.

**ID resolution**

- **playerId** = `config.token.user_id` (from config response / token).
- **gameId**: from `GET /game` (most recent) or route param `/play/:game_id`.

### 3.3 Pages (minimal UI)

For this refactor, we keep only:
- `src/pages/LoginPage.vue` (login route stays functional as-is)
- `src/pages/AdminPage.vue` (route stays `/admin`, protected by `admin` role)
- `src/pages/GamePage.vue` (new): full-screen page that mounts the Phaser game

We remove all domain CRUD pages/routing UI:
- `Controls*`, `Create*`, `Consume*` pages/components
- The navigation drawer (no domain nav links)

### 3.4 App shell (`src/App.vue`)

- Remove the navigation drawer (`v-navigation-drawer`) entirely.
- Keep:
  - the app bar title (optional: set to “Game”)
  - Logout button (existing `useAuth().logout()`)
  - optional Admin link/button if `hasAdminRole` is true

### 3.5 Tests

- **Unit**:
  - Rename/update API client unit tests from Control/Create/Consume to Game/Event/Player
  - Validate the methods used by the Phaser demo (at minimum: `getPlayer`, `getGame`, `updateGame`, `createEvent`)
- **E2E**:
  - Remove/update CRUD E2E specs that depend on domain pages and navigation drawer behavior
  - Add/maintain E2E coverage for `/play`:
    - unauthenticated redirect to `/login`
    - authenticated landing on `/play`
    - Phaser initializes (canvas present)
    - UI overlay renders player/game progress pulled from the API

---

## 4. Phase 2: Phaser 2D game integration

### 4.1 Dependency and types

- Add **phaser** to `package.json` (e.g. `^3.80.0` or current stable).
- Ensure TypeScript types (usually bundled with `phaser` or `@types/phaser` if needed).

### 4.2 Game route and page

- **Routes**: `/play` (default: most recent game), `/play/:game_id` (launch by another microservice).
  - Meta: `requiresAuth: true` only (no role constraint).
- **Page**: `src/pages/GamePage.vue`
  - Mount a single full-screen container (e.g. a `div` with fixed size or 100vw/100vh).
  - On mount: create Phaser `Game` instance with a canvas parented to that container; use a bootstrap scene that loads the first real scene.
  - On unmount: destroy the Phaser game instance (`game.destroy(true)`).

### 4.3 Game code layout

- **Option A (recommended)**: New folder `src/game/` with:
  - `bootstrap.ts` (or `main.ts`): create Phaser config and `new Phaser.Game(...)`.
  - `scenes/`: e.g. `BootScene.ts`, `MainScene.ts` (minimal 2D scene: e.g. background, player sprite, or placeholder).
  - Optional: `assets/` or reference to `public/` for images/audio.
- **Option B**: All under `src/pages/GamePage.vue` (smaller games only).

- Phaser config: use `scale` (e.g. `FIT` or `RESIZE`) so the game fits the container; parent the canvas to the Vue ref.

### 4.4 Navigation

- No domain navigation drawer/menu items are needed for the demo.
- The router should route authenticated users directly to `/play`.

### 4.5 Optional backend usage from the game

- The Phaser demo should directly demonstrate API usage (not just type wiring).

Recommended API-driven flow:
- `GamePage.vue` fetches initial data from the API (player info + current game progress) and passes an `apiContext` into Phaser.
- Phaser scenes receive `apiContext` methods they need:
  - `fetchPlayer()` / `fetchGameProgress()`
  - `recordEvent(payload)`
  - `updateGameProgress(patch)`
- **Events**: fine-grained — call `recordEvent({ player_id, name })` often (e.g. `move`, `jump`, click/tap); `name` is a one-word slug.
- **Progress**: call `updateGameProgress(patch)` less often (e.g. “addToken”, score bump, or batched state); keep progress semantics minimal and document in README.

Suggested minimal default demo behavior:
- Render one player sprite on a 2D canvas.
- On click/tap: move sprite, increment local progress, `recordEvent({ player_id, name: 'move' })` (or similar slug).
- Throttle/batch `updateGameProgress(patch)` (e.g. every N seconds or end-of-turn; patch shape TBD — e.g. `addToken` or simple score field).
- Display player name and current progress in a small overlay (from API-backed data).
- **Error handling**: follow best practices; show an overlay (e.g. retry / message) on API failure (network, 401, validation).

---

## 5. File checklist (concise)

| Area        | Files to add/rename/update |
|------------|-----------------------------|
| Router     | `src/router/index.ts` (`/play`, `/play/:game_id`, login, admin; default redirect) |
| API        | `src/api/types.ts`, `src/api/client.ts` |
| Pages      | Keep `LoginPage.vue`, keep `AdminPage.vue`, add `GamePage.vue` |
| App        | `src/App.vue` (remove navigation drawer; keep logout + optional admin link) |
| Unit tests | `src/api/Game.client.test.ts`, `Event.client.test.ts`, `Player.client.test.ts` (+ client.test, types.test) |
| E2E        | Cypress for login/admin; Playwright + simple “game loads” test; README links to Playwright docs |
| README    | As-built state, Event/Game shapes, new progress fields, E2E approach |
| Phaser     | Add `phaser`; `src/game/` (bootstrap + scene(s)); `src/pages/GamePage.vue` |

---

## 6. Decisions (product answers)

1. **Backend alignment** — Yes. Backend will expose `/api/game`, `/api/event`, `/api/player`. If we need shape changes, keep them minimal, note them specifically, and make them removable.

2. **Game progress** — Yes, `updateGame(gameId, patch)` is the pattern. New fields are allowed but minimal; document them in **README.md**.

3. **Event (POST)** — Body: `player_id: {id}`, `name: {name}`. `name` is a non-unique short one-word slug (e.g. `move`, `jump`).

4. **ID resolution** — `playerId` = `config.token.user_id`. Default game: **GET /game** returns the user’s most recent game. Also support **GET /game/:game_id**; the app has route `/play/:game_id` for when the game is launched by another microservice in production.

5. **Action loop** — Events are fine-grained (move, jump, etc.). `updateGame` is for game progress (e.g. addToken or similar); exact shape is open to ideas but should stay minimal.

6. **Play route protection** — `requiresAuth: true` only for now.

7. **Error handling** — Follow best practices; use an overlay (e.g. retry / message) when API calls fail.

8. **E2E for the game** — **Chosen: option B.** Keep Cypress for non-game flows; add Playwright with a simple “game loads” test. README includes a link to Playwright documentation.

9. **README and title** — README and app title should reflect the as-built state (Login/Admin/Game, Phaser play flow, and any new API fields).

### 6a. E2E approach (chosen)

- **Cypress** — Used for **non-game** flows: login, redirect, admin. Existing Cypress tests remain for these flows.
- **Playwright** — Added for the **game screen**: a simple “game loads” test (e.g. canvas present, overlay or game UI). Better suited than Cypress for canvas/WebGL assertions.
- **README** — Include a link to the [Playwright documentation](https://playwright.dev/docs/intro) so contributors can run and extend the game E2E tests.

---

## 7. Execution order (recommended)

1. **Phase 1 – Types and API**: Update `src/api/types.ts` + `src/api/client.ts` (and API unit tests) for Game/Event/Player + the `/api/game|event|player` paths.
2. **Phase 1 – Router + App**: Collapse routing to only `/login`, `/admin`, and `/play`; remove the navigation drawer and domain CRUD navigation from `App.vue`.
3. **Phase 1 – Game page scaffold**: Add `src/pages/GamePage.vue` plus a minimal `src/game/` bootstrap that can render a Phaser canvas.
4. **Phase 2 – API-driven gameplay**: Implement the smallest Phaser loop that:
   - fetches player info + game progress
   - records an event on action
   - updates game progress on action
5. **Phase 2 – E2E**: Keep Cypress for login/admin; add Playwright with a simple “game loads” test; add README link to Playwright documentation.
6. **README and branding**: Update README.md with as-built state (Login/Admin/Game, Phaser flow, Event/Game shapes, any new progress fields). Set app bar title to match.
7. **Cleanup**: Remove unused CRUD page references; run the full test suite and fix failures.

Decisions in §6 are recorded; the refactor can be completed per this plan.

---

## 8. Progress log

| Step | Status    | Commit / notes |
|------|-----------|----------------|
| (pre) | ✅ Done | Initial commit: refactor plan + README E2E/Playwright updates |
| 1. Types and API | Pending | |
| 2. Router + App | Pending | |
| 3. Game page scaffold | Pending | |
| 4. API-driven gameplay | Pending | |
| 5. E2E (Cypress + Playwright) | Pending | |
| 6. README and branding | Pending | |
| 7. Cleanup | Pending | |

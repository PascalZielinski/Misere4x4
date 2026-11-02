# misere4x4

A browser game: **misère three-in-a-row on a 4×4 board**. Two players alternately place their mark; whoever completes a line of three (or more) of their own marks **loses**.

The project contains a local two-player game, an interactive tutorial, online matchmaking and private rooms, a rating form, a licenses page, and a hidden "admin desktop" easter egg. The online features use the Symfony API and Mercure; the local game works without a backend.

- Stack: React, TypeScript, Vite, React Router (data router), react-i18next; PHP 8.2+, Symfony 7.4, Doctrine ORM, MariaDB, Mercure
- Languages: German (`de`) and English (`en`)
- Persistence: local game and preferences in browser storage; users, queue entries, and rooms in the backend database

---

## Table of contents

1. [Game rules](#1-game-rules)
2. [Features and status](#2-features-and-status)
3. [Getting started](#3-getting-started)
4. [Configuration](#4-configuration)
5. [Project structure](#5-project-structure)
6. [Architecture](#6-architecture)
7. [Routing](#7-routing)
8. [Game logic module](#8-game-logic-module)
9. [State and persistence](#9-state-and-persistence)
10. [Internationalization](#10-internationalization)
11. [Theming](#11-theming)
12. [Audio](#12-audio)
13. [Admin easter egg](#13-admin-easter-egg)
14. [Online mode and backend](#14-online-mode-and-backend)
15. [Rating form](#15-rating-form)
16. [Conventions](#16-conventions)
17. [Guide for reviewers](#17-guide-for-reviewers)
18. [Third-party assets and licenses](#18-third-party-assets-and-licenses)

---

## 1. Game rules

- Board: 4×4, rows `A`–`D`, columns `1`–`4` (cell labels such as `B 3`).
- Two players: **A** (mark `X`) and **B** (mark `O`).
- Players alternate placing one mark on an empty cell. The first player is chosen at random.
- A line is **three or more** adjacent identical marks in a row, column, or either diagonal.
- **The player who completes a line loses** (misère condition). Longer chains (4) count as one chain.
- If no three-in-a-row can be formed any more, the round is a **draw**.
- A local session keeps a running score (wins per player, draws). "Play again" starts a new round with a new random first player.

---

## 2. Features and status

| Area | Route | Status |
|---|---|---|
| Landing page | `/:lang` | Complete |
| Local two-player game | `/:lang/local` | Complete (autosave, score, result dialog, move lists) |
| Interactive tutorial | `/:lang/tutorial` | Complete (6 guided steps on a prepared board) |
| Online hub | `/:lang/online` | Backend-connected |
| Matchmaking queue | `/:lang/online/queue` | Backend-connected |
| Private room | `/:lang/online/private` | Backend-connected |
| Private room game | `/:lang/online/private/room/:code` | Backend-connected; live updates via Mercure |
| Rating form | `/:lang/rating` | Complete (posts to a configurable webhook) |
| Licenses and credits | `/:lang/licenses` | Complete |
| Admin login and desktop | `/:lang/admin`, `/:lang/admin/dashboard` | Easter egg, client-side only (see §13) |
| 404 | `/:lang/*` | Complete |

---

## 3. Getting started

### Frontend only

The local game and tutorial need only Node.js 22 and npm. From the repository root:

```bash
cd client
npm ci
cp .env.example .env.local
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`). Set `VITE_DEBUG=true` in `client/.env.local` if you want to skip the landing page's backend health check while reviewing the frontend without the API.

Available frontend checks:

```bash
cd client
npm run build       # TypeScript project build + Vite production build
npm run lint        # Oxlint
npm run preview     # serve the production build locally
```

### Full application with Docker Compose

The online queue and rooms need the API, database, worker, and Mercure hub. Requirements: Docker with the Compose plugin. For local browser access, create a root `.env` (do not commit it) with:

```dotenv
VITE_SERVER=http://localhost:8080
VITE_API_URL=http://server
MERCURE_PUBLIC_URL=http://localhost:3000/.well-known/mercure
API_CORS_ORIGINS=http://localhost:5173
MERCURE_CORS_ORIGINS=http://localhost:5173
MERCURE_JWT_SECRET=replace-with-a-random-value
```

Use the same `MERCURE_JWT_SECRET` for the API and hub; generate a local value, for example with `openssl rand -hex 32`. These defaults are for local review only.

```bash
docker compose build
docker compose up -d db mercure
docker compose run --rm server composer install --no-interaction
docker compose up -d server worker client
docker compose exec server php bin/console doctrine:migrations:migrate --no-interaction
```

The app is at `http://localhost:5173`, the API at `http://localhost:8080`, and Mercure at `http://localhost:3000`. The compose file maps MariaDB to host port `3307`; phpMyAdmin is optional on port `8081` and can be started separately with `docker compose up -d phpmyadmin`. To stop the services, run `docker compose down`; add `-v` only when you intentionally want to delete the persisted database and Mercure data.

If ports are already in use, change the host-side port mappings in `docker-compose.yml`. Do not expose the development credentials or the default Mercure secret to a public environment.

---

## 4. Configuration

Frontend configuration is read from Vite environment variables (`import.meta.env`). Every `VITE_*` value is **embedded into the client bundle** and is public by nature; never put credentials or private webhook secrets in one.

| Variable | Used by | Purpose |
|---|---|---|
| `VITE_SERVER` | `LandingPage` | Base URL of the game server. A `GET {VITE_SERVER}/health` request checks availability before entering the online area. |
| `VITE_WEBHOOK` | `RatingPage` | Optional endpoint that receives rating submissions as `POST` JSON `{ "content": string }`. Treat the URL as public. |
| `VITE_DEBUG` | `LandingPage` | When `"true"`, skips the server availability check. Can also be activated per page load with `?debug=1`. |
| `VITE_API_URL` | Vite dev server | API target for the `/api` development proxy. Set to `http://server` in Compose or `http://localhost:8080` when running Vite directly on the host. |

The backend uses `DATABASE_URL`, `MERCURE_URL`, `MERCURE_PUBLIC_URL`, `MERCURE_JWT_SECRET`, `MERCURE_JWT_ISSUER`, and `API_CORS_ORIGINS`. The development database URL is in `server/.env`; Compose supplies the Mercure and CORS values. See `server/.env.example` for the Symfony environment reference.

Static files referenced from `index.html`:

- `/theme-init.js`: synchronous script that applies the saved theme before first paint (see §11).
- `/favicon.svg`

---

## 5. Project structure

```
client/
  src/
    api/                    # typed fetch clients for queue and private rooms
    components/             # navigation, shared UI, background audio
    game/                   # pure local game rules
    hooks/                  # React hooks, including theme
    i18n/                   # language setup
    locales/                # German and English resources
    pages/                  # route pages and page-local stylesheets
    utils/                  # browser persistence and settings
  public/                   # static files loaded by URL
  package.json              # frontend scripts and dependencies
server/
  config/                    # Symfony, Doctrine, Security, Mercure configuration
  src/
    Controller/              # health and API endpoints
    Entity/ Repository/      # persisted users, queue entries, and rooms
    Migrations/              # Doctrine migrations
    Service/                 # matchmaking, room lifecycle, game rules
  tests/                     # PHPUnit tests
  composer.json
  Dockerfile
docker-compose.yml           # frontend, API, worker, MariaDB, Mercure, phpMyAdmin
```

Frontend styles are plain CSS files alongside their pages/components. The server is a Symfony JSON API; the dedicated worker performs periodic maintenance.

---

## 6. Architecture

```
client/src/main.tsx
  └─ App (RouterProvider)
       └─ /:lang  (loader: validate language, sync i18n)
            └─ RootLayout  = <BackgroundMusic/> + <Outlet/>
                 └─ page
                      └─ NavBar, page content, footer

client/src/api/* ── /api/* ──▶ Symfony controllers/services
                                      ├─ Doctrine ──▶ MariaDB
                                      ├─ worker ──▶ maintenance tasks
                                      └─ Mercure ──▶ room updates to browsers
```

Principles used throughout the code base:

- **Pure game rules.** The rules in `client/src/game/` are side-effect free except the `useFirstTurnSpin` hook. Server-side online rules live in `server/src/Service/MisereGameLogic.php`.
- **Immutable state updates.** `placeAt` returns a new game object; the UI replaces state and persists it.
- **External stores for cross-component state.** Audio volume uses `useSyncExternalStore` with a module-level store and `localStorage` persistence.
- **Language is part of the URL.** Every route lives under `/:lang`; links are generated through `LocalizedLink`.
- **Defensive persistence.** Browser-stored data is parsed field by field with safe defaults; online state is stored in Doctrine entities.

---

## 7. Routing

React Router (data router, `createBrowserRouter`).

```
/                    → redirect to /{detectLanguage()}
/:lang               → loader: langLoader, element: RootLayout
  index              → LandingPage
  local              → LocalGame
  licenses           → LicensesPage
  cookieTos          → CookieTosPage
  tutorial           → TutorialPage
  admin              → AdminPage
  admin/dashboard    → AdminDashboard
  online             → OnlinePage
  online/queue       → QueuePage
  online/private     → PrivateRoomPage
  online/private/room/:code → PrivateRoomGamePage
  rating             → RatingPage
  401                → Unauthorized
  *                  → NotFound
```

`langLoader`:

1. If `:lang` is not in `SUPPORTED_LANGS`, redirect to `/{detectedLang}{originalPath}`.
2. Otherwise call `i18n.changeLanguage(lang)` before the page renders, so the first paint is already translated.

`detectLanguage()` order: saved `lang` in `localStorage` → first two letters of `navigator.language` → `DEFAULT_LANG` (`en`).

`LocalizedLink` prepends `/{lang}` to its `to` prop (`"/"` maps to the language root).

---

## 8. Game logic module

### Types

| Type | Location | Meaning |
|---|---|---|
| `Side` | `game/firstTurn.ts` | `'A' \| 'B'` |
| `Mark` | `utils/localGameStorage.ts` | `'X' \| 'O'` |
| `Move` | `utils/localGameStorage.ts` | `{ side, index }`, `index` is `0..15` row-major |
| `SavedGame` | `utils/localGameStorage.ts` | Full session: player names, marks, first player, current turn, board, move list, start time, scores, draws |
| `GameResult` | `game/result.ts` | `{status:'playing'} \| {status:'draw'} \| {status:'lost', loser, chains}` |
| `Chain` | `game/result.ts` | `{ cells: number[], angle: number }` |

### Board indexing

Row-major, `index = row * SIZE + col`, `SIZE = 4`.

```
 0  1  2  3      A
 4  5  6  7      B
 8  9 10 11      C
12 13 14 15      D
 1  2  3  4
```

### Functions

| Function | Description |
|---|---|
| `newGameState(first)` | Empty board, `turn = first`, no moves |
| `placeAt(game, index)` | Returns the next game state or `null` for an out-of-range or occupied cell. Flips the turn, appends the move |
| `cellLabel(index)` | `"b 3"` style label for UI and aria labels |
| `getResult(game)` | Evaluates only chains **through the last move**. Returns `lost` (with all chains through that move), `draw`, or `playing` |
| `pillAngles(chains)` | Maps cell index → list of CSS angles, used to draw the highlight "pills" over a losing chain |
| `pickFirstPlayer()` | Uniform random side using `crypto.getRandomValues` |
| `buildSpinPlan(winner)` | Pure planner for the "who starts" animation: timestamps with growing delays and the alternating sequence ending on `winner` |
| `useFirstTurnSpin()` | Hook that schedules the plan with timers, exposes `{ shown, finished, spin, cancel }` and cancels on unmount |

### Result evaluation

- For the last placed mark, four directions are checked (horizontal, vertical, two diagonals) by walking outward in both directions while the mark matches and the position stays inside the board.
- A chain with 3 or more cells counts. All qualifying chains through the last move are returned, so crossing lines are highlighted together.
- If no chain exists, `canStillMakeThree` scans every length-3 window; a window is still possible if it contains at most one kind of mark. If no window remains, the round is a draw.

### Game flow in `LocalGame`

```
menu ── new game ──▶ names form ──▶ spin (first player) ──▶ playing
  ▲                                                          │
  └──────────── retry button (open menu) ◀──────────────────┤
                                                             ▼
                              result dialog (after 1 s) ── play again ──▶ spin
```

On each move the game is persisted. When a round ends, the winner's score (or the draw counter) is incremented before saving.

---

## 9. State and persistence

| Storage | Key | Content | Written by |
|---|---|---|---|
| `localStorage` | `misere4x4:local-game` | Serialized `SavedGame` | `saveGame` |
| `localStorage` | `audioSettings` | `{ sound: 0-100, music: 0-100 }` | `audioSettings.ts` |
| `localStorage` | `lang` | `"de"` or `"en"` | i18n `languageChanged` listener |
| Cookie | `theme` | `"light"` or `"dark"`, 1 year, `SameSite=Lax` | `useTheme` |
| `sessionStorage` | `adminUser` | Display name of the easter-egg session | `AdminPage` |
| DOM | `data-theme` on `<html>` | Active theme | `theme-init.js`, `useTheme` |
| DOM | `lang` on `<html>` | Active language | i18n `languageChanged` listener |

`loadGame()` validates each field individually: names are truncated to 12 characters, marks default to `X`/`O`, unknown `turn` falls back to the first player, board and move arrays are sanitized, and numeric counters fall back to `0`. Older saves without a `turn` are accepted.

---

## 10. Internationalization

- Library: `i18next` + `react-i18next`.
- Resources are bundled statically from `src/locales/de.json` and `en.json`.
- `interpolation.escapeValue` is `false` because React escapes rendered output.
- Rich text uses `<Trans>` with named component maps (`b`, `author`, `pixabay`, `adesso`).
- The language is chosen by the `:lang` URL segment. The NavBar language menu navigates to the same path under another language and keeps the query string.
- Parameterized keys, for example: `local.playerTurn {name}`, `local.cellTaken {cell, mark}`, `local.versus {a, b}`, `local.menu.overwrite {a, b, date}`.
- Dates in the local-game menu are formatted with `toLocaleString(i18n.language, …)`.

The admin terminal inside `AdminDashboard` is intentionally written in German and does not use the translation files.

---

## 11. Theming

- The theme is a `data-theme="light|dark"` attribute on `<html>`.
- `index.html` loads `/theme-init.js` synchronously in `<head>` so the correct theme is applied before the first paint (no flash of the wrong theme).
- `useTheme` reads the current attribute, toggles it, and stores the choice in a one-year cookie, so that the choice is also available to the bootstrap script.
- Components style themselves through CSS variables defined per theme in the global stylesheets.

---

## 12. Audio

**Background music** (`BackgroundMusic`)

- One module-level `Audio` instance looping `reverie.ogg`, mounted once in `RootLayout`.
- Volume is `settings.music / 100 * 0.1`.
- Browsers block autoplay, so playback is unlocked on the first user gesture (`pointerdown`, `pointerup`, `keydown`).
- On admin routes the music is paused and not unlocked; it resumes after leaving the admin area if it had been unlocked before.

**Admin music** (`AdminPage`)

- A separate `<audio>` element plays a different track on the login screen, paused and reset on unmount.

**Sound effects** (`LocalGame`)

- Four preloaded `Audio` objects: place `X`, place `O`, hover on an empty cell, blocked move.
- Playback volume = `0.4 * soundGain`; skipped entirely when the sound volume is 0.

**Settings** (`utils/audioSettings.ts`)

- Module-level store with `subscribe` / `getSnapshot`, consumed through `useAudioSettings()` (`useSyncExternalStore`).
- `getSoundGain()` gives non-React code the current effect gain (0–1).
- The NavBar offers one slider each for sound effects and music.

---

## 13. Admin easter egg

> **This is not an authentication system.** It is a client-side easter egg for a showcase project. The password is part of the JavaScript bundle by design. Nothing privileged is, or may be, connected to it.

**Login (`/admin`)**

- Fields: user name (optional, defaults to "Administrator") and password.
- A wrong password shakes the panel and shows an error; the correct one stores the user name in `sessionStorage` and navigates to the dashboard.
- A dedicated music track plays on this page.

**Dashboard (`/admin/dashboard`)**

A small simulated desktop:

- Animated sky that depends on the (adjustable) time of day: gradient interpolation between key hours, stars, sun/moon, meteors, clouds, hills.
- Taskbar with start menu and a clock tray. Clicking the clock opens an analog clock where the displayed time can be dragged to simulate another time of day; "Live" resets it.
- Draggable windows with a z-order manager: a folder window, a `README.txt` notepad window, and a command-line window.
- Terminal command set (German output):

| Command | Effect |
|---|---|
| `help` | List commands |
| `3erReihe -start` | Start a game; `-A` / `-B` forces the first player |
| `a1`, `b3`, `set c2` | Place a mark |
| `board` / `show` | Print the board |
| `quit` / `exit` / `stop` | Abort the game |
| `cls` / `clear` | Clear the terminal |

The terminal game reuses `placeAt` and `getResult` from `src/game/`.

---

## 14. Online mode and backend

The online mode is implemented across the React client and Symfony API. It requires the complete Docker setup (or an equivalent local backend configuration); the local two-player game does not.

- **Health check:** `GET {VITE_SERVER}/health`; a failed check displays a localized message.
- **Accounts:** `POST /api/users` creates a user; queue and room actions use the session token.
- **Matchmaking:** `POST`, `GET`, and `DELETE /api/queue` join, check, and leave the queue. The worker runs periodic maintenance.
- **Private rooms:** `POST /api/private-rooms` creates a room; `POST /api/private-rooms/join` joins by code. `GET /api/private-rooms/{identifier}` retrieves room state, and `/moves` and `/restart` handle game actions.
- **Live state:** the API issues a room-scoped Mercure subscription token; browsers receive room updates from the hub.
- **Game rules:** `server/src/Service/MisereGameLogic.php` validates turns and moves and evaluates wins/draws independently of the frontend.
- **Storage:** Doctrine persists users, queue entries, rooms, and participants in MariaDB. Apply schema migrations after installing dependencies with the command in §3.

The HTTP contract is defined by the controllers in `server/src/Controller/` and the client API modules in `client/src/api/`.

---

## 15. Rating form

- 1–5 star input implemented with radio inputs and CSS labels (rendered in reverse DOM order for the hover effect).
- Optional comment, maximum 255 characters, with a live counter.
- Only ratings of 3 stars or more can be submitted; otherwise the stars pulse.
- Submission: `POST {VITE_WEBHOOK}` with `{ "content": "New Rating: n/5\nComment: …" }`. States: `idle`, `sending`, `success`, `error`.

---

## 16. Conventions

- Function components and hooks only; no class components.
- Pages own their layout (`landing` / `landing-main` wrappers) and render `NavBar` plus a footer.
- User-visible strings go through `t()`; keys are namespaced by page (`landing.*`, `local.*`, `online.*`, `privateRoom.*`, `rating.*`, `admin.*`, `tutorial.*`, `licenses.*`, `notFound.*`, `nav.*`, `common.*`).
- External links use `target="_blank" rel="noopener noreferrer"`.
- Comments are mostly in German; identifiers are English.
- CSS custom properties are used for runtime values (`--angle`, `--len`, `--arrow-x`, `--arrow-y`, `--cell-size`).

---

## 17. Guide for reviewers

### Reviewer setup

For a quick frontend review, follow the **Frontend only** steps in §3. That is sufficient to review the local game, tutorial, routing, translations, theme, audio, and admin easter egg. Use `VITE_DEBUG=true` if no backend is running. To exercise registration, matchmaking, private rooms, and live updates, follow the **Full application with Docker Compose** steps instead, then use two separate browser profiles to simulate two players.

Run the relevant checks from the service directories:

```bash
cd client
npm run build
npm run lint

# After the full Docker setup and Composer install:
cd ..
docker compose exec server composer check
```

`composer check` runs PHPUnit, PHPStan, and PHP-CS-Fixer in check mode. Frontend test scripts are not currently defined in `client/package.json`.

### Suggested reading order

1. `client/src/game/*`: local game rules (small, pure, self-contained).
2. `server/src/Service/MisereGameLogic.php` and `server/tests/Service/MisereGameLogicTest.php`: online game rules and tests.
3. `client/src/utils/localGameStorage.ts`, `client/src/utils/audioSettings.ts`, and `client/src/utils/cookieConsent.ts`: browser persistence.
4. `client/src/App.tsx`, `client/src/i18n/*`: routing and language handling.
5. `client/src/pages/localgamepage.tsx`: local game UI and state flow.
6. `server/src/Controller/`, `server/src/Service/`, and `server/src/Entity/`: API, matchmaking, rooms, and persistence.
7. `client/src/api/*` and `client/src/pages/PrivateRoomGamePage.tsx`: online client and live game UI.
8. `client/src/pages/Tutorialpage.tsx` and `client/src/components/*`: tutorial and shared components.
9. `client/src/pages/Adminpage.tsx`, `client/src/pages/AdminDashboard.tsx`: easter egg (see §13 before judging security).

Things that are deliberate and should be evaluated in that light:

- The hard-coded admin password and the client-only dashboard guard are part of the easter egg.
- Matchmaking and private rooms use the backend; a second player is needed to exercise a complete match.
- The terminal inside the dashboard is German-only on purpose.
- The "who starts" spin is a purely visual effect on top of a uniform random choice made up front.

Useful manual test paths:

- Local game: start a game, make a three-in-a-row, check the highlight pills, the result dialog, the score, and "Play again". Reload the page and use "Load game".
- Language: open `/de/...` and `/en/...` directly, and an unsupported prefix such as `/xx/local`.
- Audio: toggle sliders in the NavBar, verify the values persist after a reload.
- Theme: toggle and reload; the page should not flash the other theme.
- Admin: log in with any name, play `3erReihe -start` in the terminal, move the clock hands.
- Online: create two user sessions in separate browser profiles, join the queue or create/join a private room, and verify that moves appear in both clients.

---

## 18. Third-party assets and licenses

Attribution is shown on the in-app licenses page (`/:lang/licenses`).

| Asset | Source | Notes |
|---|---|---|
| Background music "Reverie" | Gregor Quendel, arrangement hmscomp, provided by classicals.de | License text is shown on the licenses page |
| Interface sound effects | kenney.nl "Interface Sounds" | License text is shown on the licenses page |
| Admin music | Pixabay (author samuelfjohanns) | Pixabay content license |
| Icons / SVGs | svgrepo.com | License text is shown on the licenses page |
| Fonts | Open Sans, Lato via `@fontsource` | Open-source font licenses |
| Task description | adesso SE | Linked on the licenses page and in the rules panel |
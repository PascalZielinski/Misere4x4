# misere4x4

A browser game: **misère three-in-a-row on a 4×4 board**. Two players alternately place their mark; whoever completes a line of three (or more) of their own marks **loses**.

The project is a showcase / application project. It contains a local two-player game, an interactive tutorial, a mocked online lobby, a rating form, a licenses page, and a hidden "admin desktop" easter egg.

- Stack: React, TypeScript, Vite, React Router (data router), react-i18next
- Languages: German (`de`) and English (`en`)
- Persistence: browser storage only (no backend is required to run the local game)

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
14. [Online mode](#14-online-mode)
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
| Online hub | `/:lang/online` | UI only, queue counter is mocked |
| Matchmaking queue | `/:lang/online/queue` | UI only, mocked |
| Private room | `/:lang/online/private` | UI only, server calls are marked `TODO` |
| Private room lobby | `/:lang/online/private/room/:code?` | Not implemented (route is commented out) |
| Rating form | `/:lang/rating` | Complete (posts to a configurable webhook) |
| Licenses and credits | `/:lang/licenses` | Complete |
| Admin login and desktop | `/:lang/admin`, `/:lang/admin/dashboard` | Easter egg, client-side only (see §13) |
| 404 | `/:lang/*` | Complete |

---

## 3. Getting started

Requirements: a current Node.js LTS and npm.

```bash
npm install
npm run dev        # development server
npm run build      # production build
npm run preview    # serve the production build locally
```

> The script names above are the standard Vite ones. Check `package.json` for the exact scripts and add linting/test scripts there once they exist.

---

## 4. Configuration

Configuration is read from Vite environment variables (`import.meta.env`). All `VITE_*` variables are **embedded into the client bundle** and are therefore public by nature.

| Variable | Used by | Purpose |
|---|---|---|
| `VITE_SERVER` | `LandingPage` | Base URL of the game server. A `GET {VITE_SERVER}/health` request checks availability before entering the online area. |
| `VITE_WEBHOOK` | `RatingPage` | Endpoint that receives rating submissions as `POST` JSON `{ "content": string }`. |
| `VITE_DEBUG` | `LandingPage` | When `"true"`, skips the server availability check. Can also be activated per page load with `?debug=1`. |

Static files referenced from `index.html`:

- `/theme-init.js`: synchronous script that applies the saved theme before first paint (see §11).
- `/favicon.svg`

---

## 5. Project structure

```
index.html
public/
  theme-init.js            # pre-paint theme bootstrap
  favicon.svg
src/
  main.tsx                 # entry: fonts, global CSS, i18n, <App/>
  App.tsx                  # router definition, RootLayout, language loader
  i18n/
    index.ts               # i18next setup
    languages.ts           # SUPPORTED_LANGS, detectLanguage, isSupported
  locales/
    de.json
    en.json
  pages/
    landingpage.tsx
    localgamepage.tsx
    Tutorialpage.tsx
    Onlinepage.tsx
    Queuepage.tsx
    Privateroompage.tsx
    Ratingpage.tsx
    licensespage.tsx
    Adminpage.tsx
    AdminDashboard.tsx
    404.tsx
  components/
    NavBar.tsx             # language menu, audio menu, theme toggle
    LocalizedLink.tsx      # <Link> that prefixes the current language
    LanguageSwitcher.tsx   # <select> based language switcher
    BackgroundMusic.tsx    # global looping music with autoplay unlock
  game/
    placement.ts           # board constants, placeAt, cellLabel
    result.ts              # getResult, chain detection, pillAngles
    firstTurn.ts           # Side type, pickFirstPlayer, useFirstTurnSpin
  hooks/
    useTheme.ts
  utils/
    audioSettings.ts       # external store for volume settings
    localGameStorage.ts    # save/load of the local game
  assets/                  # svg icons, ogg/mp3 audio, images
```

Each page has a stylesheet next to it (`landingpage.css`, `localgamepage.css`, and so on). Stylesheets are plain global CSS imported by the page that needs them.

---

## 6. Architecture

```
main.tsx
  └─ App (RouterProvider)
       └─ /:lang  (loader: validate language, sync i18n)
            └─ RootLayout  = <BackgroundMusic/> + <Outlet/>
                 └─ page
                      └─ NavBar, page content, footer
```

Principles used throughout the code base:

- **Pure game rules.** Everything in `src/game/` is side-effect free except the `useFirstTurnSpin` hook. Rules can be tested without React.
- **Immutable state updates.** `placeAt` returns a new game object; the UI replaces state and persists it.
- **External stores for cross-component state.** Audio volume uses `useSyncExternalStore` with a module-level store and `localStorage` persistence.
- **Language is part of the URL.** Every route lives under `/:lang`; links are generated through `LocalizedLink`.
- **Defensive persistence.** Stored data is parsed field by field with safe defaults.

---

## 7. Routing

React Router (data router, `createBrowserRouter`).

```
/                    → redirect to /{detectLanguage()}
/:lang               → loader: langLoader, element: RootLayout
  index              → LandingPage
  local              → LocalGame
  licenses           → LicensesPage
  tutorial           → TutorialPage
  admin              → AdminPage
  admin/dashboard    → AdminDashboard
  online             → OnlinePage
  online/queue       → QueuePage
  online/private     → PrivateRoomPage
  rating             → RatingPage
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

## 14. Online mode

The online area currently consists of the UI shell:

- **Landing availability check:** `GET {VITE_SERVER}/health` with a 3 second timeout (opaque `no-cors` request). Failure shows a localized "server not reachable" message.
- **Online hub:** "Queue" starts a mocked queue panel whose player count cycles through a fixed list of numbers; "Private game" opens the private-room page.
- **Private room:** create a room, or join with a 4-digit numeric code. The server calls are stubbed with `TODO` markers; the success path navigates to the (not yet existing) room route. Error states are modeled: `invalid`, `notFound`, `generic`.

The server protocol is not part of this repository.

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

Suggested reading order:

1. `src/game/*`: the core rules (small, pure, self-contained).
2. `src/utils/localGameStorage.ts` and `src/utils/audioSettings.ts`: persistence.
3. `src/App.tsx`, `src/i18n/*`: routing and language handling.
4. `src/pages/localgamepage.tsx`: the main UI and its state machine.
5. `src/pages/Tutorialpage.tsx`: guided overlay with measured tooltips.
6. `src/components/*`: NavBar, BackgroundMusic, LocalizedLink.
7. `src/pages/Adminpage.tsx`, `AdminDashboard.tsx`: easter egg (see §13 before judging security).
8. Online pages: UI shells only, see §14.

Things that are deliberate and should be evaluated in that light:

- The hard-coded admin password and the client-only dashboard guard are part of the easter egg.
- Queue numbers on the online pages are fake placeholder data.
- The terminal inside the dashboard is German-only on purpose.
- The "who starts" spin is a purely visual effect on top of a uniform random choice made up front.

Useful manual test paths:

- Local game: start a game, make a three-in-a-row, check the highlight pills, the result dialog, the score, and "Play again". Reload the page and use "Load game".
- Language: open `/de/...` and `/en/...` directly, and an unsupported prefix such as `/xx/local`.
- Audio: toggle sliders in the NavBar, verify the values persist after a reload.
- Theme: toggle and reload; the page should not flash the other theme.
- Admin: log in with any name, play `3erReihe -start` in the terminal, move the clock hands.

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
# misere4x4: Review Findings and Fix List

Consolidated result of the code review (security, correctness, clean code, accessibility, performance, testing, tooling).

**How to use this file:** work through the phases in order, tick the boxes, and keep the IDs in commit messages (for example `fix(S-01): proxy rating webhook`).

**Not reviewed (not provided):** all CSS files, the locale JSONs, `public/theme-init.js`, `vite.config.ts`, `tsconfig*.json`, `package.json`. Items marked *(verify)* depend on those.

**Scope note:** the admin password and dashboard are a deliberate easter egg (client-side, no real asset behind it). Findings about them are about honesty of the guard, robustness, and not letting it drift into something real.

## Severity legend

| Tag | Meaning |
|---|---|
| 🔴 Must | Security issue or crash bug. Fix before publishing |
| 🟠 Should | Correctness, maintainability, accessibility problems that users or contributors will hit |
| 🟡 Nice | Cleanup, polish, long-term health |

## Overview

| Phase | Goal | Items |
|---|---|---|
| 1 | Security and crash bugs | S-01 … S-08, B-01 … B-03 |
| 2 | Correctness and dead ends | B-04 … B-14 |
| 3 | Structure and clean code | C-01 … C-18 |
| 4 | Accessibility and UX | A-01 … A-14 |
| 5 | Performance and build | P-01 … P-08 |
| 6 | Tests, tooling, docs | T-01 … T-10 |

---

## Phase 1: Security and crash bugs

### 🔴 S-01 Discord webhook exposed in the client bundle
- **Where:** `RatingPage` (`VITE_WEBHOOK`)
- **Problem:** every `VITE_*` variable is public. Anyone can extract the webhook and post arbitrary content or mentions into your channel.
- **Fix:**
  - [ ] Create a small backend endpoint (`POST /api/rating`) that validates input and forwards to Discord; keep the webhook secret server-side only.
  - [ ] **Rotate the current webhook** if it was ever deployed.
  - [ ] Remove `VITE_WEBHOOK` from the client and from `.env.example`.

### 🔴 S-02 No server-side validation or abuse protection for ratings
- **Where:** `RatingPage` (`MIN_RATING`, `MAX_COMMENT` only checked in the browser)
- **Fix (backend):**
  - [ ] Validate rating is an integer 1–5, comment ≤ 255 chars.
  - [ ] Strip or neutralize mentions (`@everyone`, `@here`, `<@id>`).
  - [ ] Rate limit per IP; optionally a honeypot field or CAPTCHA.

### 🔴 S-03 `?debug=1` works in production
- **Where:** `LandingPage`
- **Problem:** any visitor can bypass the server check.
- **Fix:**
  - [ ] Gate with `import.meta.env.DEV` so it is removed from production builds.
  - [ ] Translate the hard-coded `(Debug)` label or drop it.

### 🔴 S-04 Unguarded storage access crashes routes
- **Where:** `detectLanguage` (`localStorage.getItem("lang")`), i18n `languageChanged` (`setItem`), `AdminDashboard` (`sessionStorage.getItem`), `AdminPage` (`sessionStorage.setItem`)
- **Problem:** throws in Safari private mode or when storage is blocked; for `detectLanguage` this breaks the root redirect loader.
- **Fix:**
  - [ ] Add `utils/safeStorage.ts` (`get`, `set`, `remove`, local and session variants, all try/catch).
  - [ ] Replace every direct `localStorage` / `sessionStorage` call.

### 🔴 S-05 Audio volume can leave the valid range
- **Where:** `audioSettings.load()` and `update()`, `BackgroundMusic`, `AdminPage`
- **Problem:** stored values are only checked with `Number.isFinite`. `HTMLMediaElement.volume` outside 0–1 throws `IndexSizeError`.
- **Fix:**
  - [ ] Clamp to 0–100 in `load()` and `update()`.
  - [ ] Optionally clamp again where volume is assigned.

### 🟠 S-06 Health check cannot detect an unhealthy server
- **Where:** `pingServer` (`mode: 'no-cors'`)
- **Problem:** opaque responses only fail on network errors; a `500` or `502` counts as "up".
- **Fix:**
  - [ ] Enable CORS on `/health` and check `res.ok`.
  - [ ] Add a retry button to the "server down" message.

### 🟠 S-07 Admin easter egg: keep it honest
- **Where:** `AdminPage`, `AdminDashboard`, `App.tsx`
- **Fix:**
  - [ ] Add a comment at `PASSWORD`: *client-side easter egg, not authentication, never reuse this value*.
  - [ ] Add the same note to the README (done in §13) and keep it current.
  - [ ] Add a router `loader` on `admin/dashboard` that redirects to `/:lang/admin` when no session flag exists.
  - [ ] Use a dedicated boolean key (`adminSession`) instead of deriving login state from the display name; clear it on leaving.
  - [ ] Ensure `build.sourcemap` is off in production *(verify)*.
  - [ ] Decide whether the footer link to `/admin` should stay (it makes the egg discoverable).
  - [ ] Optional: compare a salted hash (Web Crypto) so the password does not appear in plaintext in the bundle. This is obfuscation only.

### 🟠 S-08 Hardening and privacy
- **Fix:**
  - [ ] Set security headers on the host: CSP, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`.
  - [ ] Add `Secure` to the `theme` cookie on HTTPS (or move the preference to `localStorage` if the bootstrap script can read it from there).
  - [ ] Keep user-supplied values (player names) out of `<Trans>`; `escapeValue: false` is only safe for plain interpolation rendered as children.
  - [ ] If EU visitors are expected: privacy notice and imprint; note that the rating form sends the visitor's IP to a third party unless S-01 is done.
  - [ ] Future private rooms: codes of 4 digits are enumerable. Use longer codes from an unambiguous alphabet (about 6 characters), expiry, per-IP attempt limits, identical responses for "not found" and "full", and validate the `:code` route param.

### 🔴 B-01 Draw semantics undecided
*(rules decision, move here because it affects the core game)*
- **Where:** `game/result.ts` (`canStillMakeThree`)
- **Observation:** the draw check detects boards where no line of three can ever be completed. It does not detect "forced loss" positions (every remaining move loses). This may be exactly what you want, but it is not documented.
- **Fix:**
  - [ ] Decide and document the intended rule in the rules text and README §1/§8.
  - [ ] Add tests for both full-board and dead-board draws.
  - [ ] Optional: a memoized minimax over 16 cells would give forced-outcome detection and a perfect bot.

### 🔴 B-02 `title="C:\\"` renders two backslashes
- **Where:** `AdminDashboard` (cmd window)
- **Fix:**
  - [ ] Use `title={'C:\\'}` (JSX attribute strings do not process escapes). Check the taskbar label too.

### 🔴 B-03 Private room flow ends in a 404
- **Where:** `PrivateRoomPage` navigates to `/online/private/room[/code]`, route is commented out in `App.tsx`
- **Fix:**
  - [ ] Hide the page behind a feature flag until the lobby exists, or disable the buttons with a "coming soon" state.

---

## Phase 2: Correctness and dead ends

### 🟠 B-04 Unknown-language redirect produces confusing URLs
- **Where:** `langLoader`
- **Problem:** `/foo/local` becomes `/en/foo/local` (404); `/local` becomes `/en/local` (works). Same code path, different meaning.
- **Fix:**
  - [ ] Decide: strip an unknown first segment, or show a global 404.
  - [ ] Add a top-level catch-all route outside `/:lang`.

### 🟠 B-05 `pathname.replace(`/${lang}`, '')` is fragile
- **Where:** `NavBar`, `LanguageSwitcher`
- **Fix:**
  - [ ] Add `switchLangInPath(pathname, from, to)` using `^/${from}(?=/|$)` and use it everywhere.
  - [ ] Delete `LanguageSwitcher` if it stays unused (see C-04).

### 🟠 B-06 `LocalizedLink` and navigation with undefined language
- **Where:** `LocalizedLink`, `navigate(`/${lang}/…`)` in 4 files
- **Problem:** `useParams().lang` is `string | undefined` → `/undefined/local`. `LocalizedLink` only supports string `to`.
- **Fix:**
  - [ ] Fall back to `DEFAULT_LANG`.
  - [ ] Support object `to` (`pathname`, `search`, `hash`) or narrow the prop type honestly.
  - [ ] Add `useLocalizedNavigate()` and use it in `LandingPage`, `OnlinePage`, `QueuePage`, `PrivateRoomPage`.

### 🟠 B-07 `BackgroundMusic` module-level `Audio`
- **Where:** `BackgroundMusic.tsx`
- **Problems:** runs on import (breaks tests/SSR, duplicates on HMR); `tryPlay()` is called on mount and always blocked; `pointerdown` + `pointerup` is redundant; state logic around `authorizedRef` is hard to follow.
- **Fix:**
  - [ ] Create the audio object lazily (getter or `useRef`).
  - [ ] Listen to `pointerdown` and `keydown` only; drop the initial `tryPlay()`.
  - [ ] Extract `useAutoplayUnlock`.

### 🟠 B-08 `useTheme` does not stay in sync
- **Where:** `hooks/useTheme.ts`
- **Fix:**
  - [ ] Use `useSyncExternalStore` (same pattern as audio) or a `MutationObserver` on `data-theme`.
  - [ ] Consider `prefers-color-scheme` as the default.

### 🟠 B-09 Rating page details
- **Where:** `RatingPage`
- **Fix:**
  - [ ] Remove redundant `rating === 0 ||`.
  - [ ] Early return when `status === 'sending'`.
  - [ ] Add `AbortController` and a timeout to the `fetch`.
  - [ ] Clear the success message when the user edits again.
  - [ ] Ratings below 3 are silently blocked with only a pulse. Either accept all ratings or explain the rule in the UI.
  - [ ] Replace the status string with `useReducer` (optional).

### 🟠 B-10 Unsafe cast hides a type hole
- **Where:** `AdminDashboard.createFreshGame` (`as SavedGame`), `placeAt`/`getResult` typed on `SavedGame`
- **Fix:**
  - [ ] Introduce `GameState = { board, turn, moves, markA, markB }` and `SavedGame = GameState & {…}`.
  - [ ] Make `placeAt` generic (`<T extends GameState>`) and `getResult` take only what it needs.
  - [ ] Delete the cast.

### 🟠 B-11 Game-over invariant lives in the callers
- **Where:** `placeAt` accepts moves after the game ended; `LocalGame.handleCell` and the terminal duplicate score/outcome handling
- **Fix:**
  - [ ] Add `applyMove(game, index): { game, result } | null` in `game/` that refuses moves when the result is not `playing`.
  - [ ] Use it from both `LocalGame` and the terminal.

### 🟠 B-12 Local game edge cases
- **Where:** `LocalGame`
- **Fix:**
  - [ ] Reject identical player names (or disambiguate them).
  - [ ] Compute a `turnKey` outside the shake effect to satisfy `exhaustive-deps`.
  - [ ] Read `loadGame()` when the menu opens instead of mirroring `saved` and `game`.

### 🟠 B-13 Saved game validation and versioning
- **Where:** `localGameStorage.ts`
- **Problem:** shape is validated, semantics are not (`turn` and `board` may not match `moves`). A hand-edited save with a completed line but another last move reads as `playing`.
- **Fix:**
  - [ ] Add a `version` field now (a legacy migration already exists).
  - [ ] Optional: replay `moves` on an empty board during load and compare with `board`.
  - [ ] Derive board size from `SIZE` instead of the literal `16`.
  - [ ] Remove or use `clearGame` (dead code today).

### 🟠 B-14 `useFirstTurnSpin` details
- **Where:** `game/firstTurn.ts`
- **Fix:**
  - [ ] Reset `shown` to `null` in `spin` and `cancel` (stale name can flash).
  - [ ] Empty `timers.current` after the last timer fires.
  - [ ] Document that `onDone` must not depend on fresh React state.
  - [ ] Rename `GROWTH` to `DELAY_GROWTH_FACTOR`.

### 🟡 B-15 Dashboard behavior
- **Where:** `AdminDashboard`
- **Fix:**
  - [ ] Remove dead `open` / `windowZ.main` (the taskbar button for the name makes itself disappear).
  - [ ] Clamp window positions to the viewport; reduce the initial ±200 px offsets on small screens.
  - [ ] Cap `cmdLines` (for example 500) and use functional `setCmdLines`.
  - [ ] Use `Array.from(name)[0]` for the avatar initial; add `maxLength` to the user-name input.
  - [ ] Replace three copies of "open window → activate → close start menu" with `openWindow(id)` (or a reducer).

### 🟡 B-16 Locale consistency
- **Where:** `toLocaleTimeString([])` in the dashboard, `queueCount.toLocaleString()`, hard-coded AM/PM in the clock picker
- **Fix:**
  - [ ] Pass `i18n.language` consistently.

### 🟡 B-17 `PrivateRoomPage` dead branch
- **Where:** the submit button is disabled unless 4 digits are entered, so `setJoinError('invalid')` is unreachable
- **Fix:**
  - [ ] Either keep the button enabled and show the error, or delete the branch.
  - [ ] Include the error element id in `aria-describedby`.

### 🟡 B-18 Unused exports
- [ ] `getSoundGain` is used only if sound code consumes it (it does in `LocalGame`); confirm no other dead exports (`emptyBoard`, `buildSpinPlan` export only for tests, `clearGame`).
- [ ] Fix the Pixabay URL typo `//?` in `LicensesPage`.

---

## Phase 3: Structure and clean code

- [ ] **C-01 Types layering.** Create `game/types.ts` with `Side`, `Mark`, `Move`, `GameState`. Make `localGameStorage` depend on `game/`, not the reverse (removes the type-level circular import).
- [ ] **C-02 Share game UI.** `TutorialPage` duplicates about 150 lines of `LocalGame`. Extract `<GameBoard>`, `<ScorePanel>`, `<MoveList>`, `<PlayerName withCrown>`. Move the inline-styled crown+name blocks in the result dialog into CSS.
- [ ] **C-03 Layout components.** Footer is duplicated across pages and `NavBar`/`landing` wrappers repeat. Create `<PageLayout>` and `<SiteFooter variant>` (or move them into `RootLayout`).
- [ ] **C-04 Dead code.** `LanguageSwitcher` (NavBar has its own), one of `QueuePage` / inline queue panel in `OnlinePage` (nothing navigates to `/online/queue`).
- [ ] **C-05 Queue panel.** Extract `<QueuePanel>`; mark fake numbers with `// MOCK` and gate them behind the debug flag.
- [ ] **C-06 Centralize env.** `src/config.ts` with typed values; validate at startup (for example with `zod`). Add `.env.example`.
- [ ] **C-07 Split `NavBar`.** `LanguageMenu`, `AudioMenu`, `ThemeToggle`, shared `useDropdown` / `useClickOutside`.
- [ ] **C-08 Split `AdminDashboard` (~600 lines).** `desktop/sky.ts`, `DraggableWindow`, `AnalogClock`, `Terminal`, `StartMenu`.
- [ ] **C-09 Pure terminal.** Extract `runCommand(input, state) → { lines, state }`; unit-test it.
- [ ] **C-10 Tutorial data-driven.** Replace `step >= 4`, `step === 1`, parallel arrays (`targetRefs`, `STEP_PLACEMENTS`) with one `STEPS` array of objects.
- [ ] **C-11 Shared `CSSVars` type.** Replace the three different cast styles with one `CSSProperties & { [K in `--${string}`]?: string | number }`.
- [ ] **C-12 Typed i18n.** Add i18next `CustomTypeOptions`; replace dynamic keys (`privateRoom.${joinError}`, `tutorial.step${n}`) with explicit maps; rename key `admin.3`.
- [ ] **C-13 Constants.** One `rowLabel(r)`, derive `ROWS`/`COLS` from `SIZE`, add `LOSING_LENGTH = 3`, replace `% 90` pill-length magic; name the numbers in `NotFound` (`i % 3`, `i * 7`, `ITEMS * 2`).
- [ ] **C-14 `ExternalLink` component** for repeated `target="_blank" rel="noopener noreferrer"`.
- [ ] **C-15 Naming.** Pick one file naming scheme (`LandingPage.tsx`, `NotFoundPage.tsx`, …). Rename `Screenshot 2026-10-28 223508.png` to a meaningful name, convert to WebP/AVIF, set `width`/`height`.
- [ ] **C-16 Style consistency.** Prettier (semicolons are inconsistent in `RatingPage`), one comment language, remove the commented-out route in `App.tsx`.
- [ ] **C-17 Global CSS coupling.** `TutorialPage` imports `localgamepage.css`; generic class names (`.board`, `.cell`, `.panel`, `.overlay`) are global. Use CSS Modules or a shared prefixed `game.css`.
- [ ] **C-18 Hard-coded German outside i18n.** "Schließen", "Uhrzeit anpassen", "Start", "AM/PM umschalten", `README.txt - Editor`. Terminal stays German on purpose (documented in the README); the rest should use `t()`.

Smaller code-quality notes:
- [ ] `canStillMakeThree`: replace the `Set` per window with two counters.
- [ ] Comment on `pickFirstPlayer`: `% 2` is unbiased; `crypto` is not strictly needed.
- [ ] Comment on `DIRS.angle`: it is the CSS rotation for the highlight pill.

---

## Phase 4: Accessibility and UX

- [ ] **A-01 Dropdowns (NavBar).** Close on `Escape`, add `pointerdown`/`touchstart` to click-outside, return focus to the toggle, add `aria-haspopup` and `aria-controls`.
- [ ] **A-02 Real modals.** Tutorial tooltip, result card, and menu overlay declare `aria-modal="true"` but have no focus trap, no Escape handling, no `aria-labelledby`, and the page behind stays tabbable. Use `<dialog>` or `inert` on the background.
- [ ] **A-03 Live-region spam.** Queue counter (`aria-live` changes every 1.2 s) and the first-player spin (~35 changes) should not be announced; announce only final results.
- [ ] **A-04 Slider labels.** Add `aria-valuetext`; use `alt=""` on the icons next to labelled sliders.
- [ ] **A-05 Star rating.** DOM order is 5→1; make sure arrow-key direction feels right and focus is visible.
- [ ] **A-06 Language buttons.** `EN` / `DE` only; add native names via `title` or `aria-label`.
- [ ] **A-07 Reduced motion.** Respect `prefers-reduced-motion` for: shake hint, pulse, 404 background, meteors, clouds, first-player spin (show the winner immediately).
- [ ] **A-08 Autoplay music.** Music starts on first interaction (WCAG 1.4.2). Consider opt-in or default off; keep the 10 % cap.
- [ ] **A-09 Tutorial retry button.** Focusable with an empty `onClick`; set `disabled` or `tabIndex={-1}`.
- [ ] **A-10 Tooltip placement.** Measured on mount and `resize` only; add `ResizeObserver` and `visualViewport` handling.
- [ ] **A-11 Desktop simulation.** `role="menu"` needs arrow-key navigation (or use plain buttons); Escape for the clock panel; `touch-action: none` on draggable elements *(verify in CSS)*.
- [ ] **A-12 Preference overwrite.** Opening a shared `/de/…` link overwrites the saved language. Decide if that is intended.
- [ ] **A-13 Server-down UX.** Add retry (see S-06).
- [ ] **A-14 Admin music volume.** `AdminPage` uses `music / 100`, `BackgroundMusic` caps at `* 0.1`. Share one constant.

---

## Phase 5: Performance and build

- [ ] **P-01 Code splitting.** Lazy-load `AdminDashboard`, `AdminPage`, `LocalGame`, `TutorialPage` (React Router `lazy`).
- [ ] **P-02 Audio objects.** `LocalGame` creates four `Audio` objects at import time and `App.tsx` imports it eagerly. Create them lazily.
- [ ] **P-03 Dashboard re-renders.** `setNow` every second re-renders the whole desktop. Extract `<Clock>`, memoize `<Stars>`, write `night` as a CSS variable (`--night`), update the sky about once per minute.
- [ ] **P-04 Ogg support.** Safari support for Ogg Vorbis is limited; add an `.mp3`/`.m4a` fallback for `reverie.ogg` and the effects.
- [ ] **P-05 Asset inlining.** Check `assetsInlineLimit` and hashed filenames *(verify)*.
- [ ] **P-06 Fonts.** Five font weights across two families; trim unused, subset to `latin`.
- [ ] **P-07 404 background.** About 15 rows × 60 spans; replace with CSS repetition.
- [ ] **P-08 Error handling.** Add `errorElement` / error boundary (loader failures such as `i18n.changeLanguage` rejecting currently hit the default router error).

---

## Phase 6: Tests, tooling, docs

### `index.html` findings
- [ ] **T-01** `lang="en"` is static; i18n updates it later. Acceptable, but consider setting it from `theme-init.js` as well to avoid a wrong value before hydration.
- [ ] **T-02** Improve `<meta name="description">` (currently "Application project Three in a row."), add `theme-color`, `color-scheme`, and Open Graph tags if the site is shared.
- [ ] **T-03** `theme-init.js` is a blocking classic script: correct for avoiding a theme flash, but keep it tiny, make sure it cannot throw (cookie parsing in try/catch), and allow it in the CSP (same-origin script, no inline needed) *(verify file)*.

### Tooling
- [ ] **T-04** ESLint with `typescript-eslint`, `react-hooks`, `jsx-a11y`; Prettier; lint-staged + husky or CI.
- [ ] **T-05** `tsconfig`: `"strict": true`, `noUncheckedIndexedAccess` *(verify)*.
- [ ] **T-06** Dependabot or Renovate; `npm audit` in CI.
- [ ] **T-07** `.env.example` documenting `VITE_SERVER`, `VITE_DEBUG` (and `VITE_WEBHOOK` until S-01 is done).

### Tests (Vitest + Testing Library)
- [ ] **T-08 `getResult`:** row, column, diagonal, anti-diagonal; no wrap-around (cells 2, 3, 4 with same mark stay `playing`); 4-chain as a single chain; two crossing chains through the last move; draw on a full board; dead board draw (see B-01).
- [ ] **T-09 Other pure logic:** `placeAt` (occupied, out of range, turn flip, original not mutated), `applyMove` (rejects after game over), `loadGame` (corrupt and legacy JSON), `parseMove`, `buildSpinPlan` (last side equals winner, times strictly increasing, last time ≤ `TOTAL_MS`), `nightAmount` / `skyColors` at 5, 7, 18, 20 h, `switchLangInPath`, `audioSettings` clamping, `LocalizedLink`, rating submit flow with mocked `fetch`.
- [ ] **T-10 E2E smoke (Playwright):** play a full local game → result dialog → play again; language switch; load saved game.

### Documentation
- [ ] Keep `README.md` in sync when items above change behavior (routes, env variables, storage keys).
- [ ] Verify license texts on the licenses page against the actual licenses (Pixabay content license, classicals.de recording terms, Kenney CC0) and that both languages contain them.

---

## Suggested order of work

1. S-01, S-02, S-03, S-04, S-05, B-02, B-03 (all 🔴, mostly small).
2. B-01 rules decision, B-10, B-11, C-01 (core types and logic; unlocks tests).
3. T-08, T-09 (lock the game logic with tests before refactoring the UI).
4. S-07, S-08, S-06, B-04 … B-09.
5. C-02, C-03, C-05, C-07, C-08 (de-duplicate and split large components).
6. A-01 … A-14, P-01 … P-08.
7. Tooling (T-04 … T-07), E2E (T-10), final README sync.

## Definition of done per item

- Change merged with the item ID in the commit message.
- Covered by a test where the logic is pure.
- README updated if routes, env variables, storage keys, or behavior changed.
- No new `any`, no new direct storage access, no new hard-coded user-visible strings.
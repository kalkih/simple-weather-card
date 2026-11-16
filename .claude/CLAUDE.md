# Simple Weather Card

A Home Assistant dashboard card (Lit 3, TypeScript, webpack), distributed as
one file, `dist/simple-weather-card.js`, through the Marketplace/HACS. Fork of
kalkih/simple-weather-card. Code, commits, PRs, README and release notes are in
English.

Personal, machine-specific notes go in `.claude/rules/personal.md` (not
committed; every file in `.claude/rules/` is loaded automatically).

## Layout

- `src/simple-weather-card.ts` – the card. `src/editor.ts` – visual editor,
  loaded eagerly into the same bundle.
- `src/weather.ts` – `WeatherEntity` (attribute getters, icons, night logic,
  wind direction), `src/actions.ts` – actions, `src/localize.ts` +
  `src/translations/*.json` – editor translations (en, nb; nn uses nb).
- `src/icons/` – static icons (PNG/SVG) and `animated/` SVGs, inlined into the
  bundle. File names are hyphenated, like HA's conditions (`clear-night`).
- `test/` – Node test runner. `card.test.mjs` and `editor.test.mjs` load the
  **built** bundle in happy-dom with a fake `hass` from `helpers.mjs`, so
  `yarn build` before `yarn test`.
- `.github/workflows/` – build (typecheck, lint, build, test, artifact),
  release (manual button), labeler, HACS validation.
- `dev/` – local Home Assistant in Docker for manual testing.

## Commands

`yarn build`, `yarn watch`, `yarn typecheck`, `yarn lint` (max 0 warnings),
`yarn test`, `yarn ha:up` / `ha:down` / `ha:logs` (needs Docker and a build).
Format with `yarn prettier --write <files>`, which also aligns markdown
tables.

## Workflow

- Never commit on `master`; create a branch first. The prefix sets the PR
  label and release notes category: `feat/` (Features), `fix/` (Fixes),
  `chore/`, `ci/`, `docs/`, `refactor/` (Maintenance).
- Commit when a piece of work is done and verified. Messages: short subject,
  blank line, bullets with the why.
- `master` requires a PR, green `build` and `validate` checks, and signed
  commits. PRs with unsigned commits can still be merged with **Squash and
  merge**, since GitHub signs the squash commit. Wait for the checks before
  merging: deleting the branch right after merging makes the PR's HACS
  validation fail with "Not Found".
- Releases: Actions → Release → Run workflow (patch/minor/major, beta). It
  creates a draft with generated notes; a summary goes above them before
  publishing.
- Verify claims instead of guessing (HA source in the test container, git
  history, the GitHub API). Before saying something works, test it, and say
  clearly what wasn't tested.
- New behavior gets smoke tests that fail against `master`.
- happy-dom resolves `customElements.whenDefined()` with `undefined`; look the
  class up with `customElements.get()`.

## Skills

Use these instead of doing the steps by hand; they hold the details.

- `/verify` – every check, plus new tests against `master`. Run it before
  committing a change to the card and before writing a PR.
- `/pr-text` – the PR title and description for the current branch.
- `/release-notes` – the release summary and the version bump.

## Decisions

- Degrees have no space before the unit (`21.6°C`); other units keep it.
- Editor allows 1–7 `forecast_slots`; YAML has no limit.
- `animated_icons` stays a boolean (an "animate only the main icon" option
  was built and rejected).
- Sections dashboards: `getGridOptions()` returns
  `{ columns: 12, min_columns: 6 }`; rows follow the content.
- Don't revisit the "Since" version of `backdrop` in the README.
- README shows one gallery image (`images/gallery.png`) plus `editor.png`.

## Custom card essentials

How a dashboard card talks to Home Assistant. Check against the reference
implementation before inventing something: HA's frontend repo
(`home-assistant/frontend`), especially
`src/panels/lovelace/cards/hui-weather-forecast-card.ts`, `src/data/weather.ts`
and `src/common/` (formatting, translations). The backend source is in the
test container under `/usr/src/homeassistant/homeassistant/`, frontend
translations under `site-packages/hass_frontend/static/translations/`.

**The card contract**

- `setConfig(config)` runs first and on every editor change, on the **same
  element** (the editor preview isn't recreated). Throwing shows an error card;
  HA's own cards throw for a missing entity too. Normalize defaults here.
- `set hass(hass)` runs on **every state change in Home Assistant**, not just
  the card's entity. Keep it cheap: compare the entity object by reference,
  and let `shouldUpdate` filter re-renders.
- `getCardSize()` – masonry height in 50px units. `getGridOptions()` –
  sections grid; 12 columns is one dashboard column, and a section with
  `column_span: N` has 12×N columns. Stored `grid_options` in a card's config
  override it, and `min_columns` only limits the editor.
- `static getConfigElement()` / `getStubConfig(hass)` for the editor and card
  picker; `window.customCards.push(...)` lists the card in the picker.
- Card-mod and UIX are applied via their `applyToElement` once per config.

**Weather data**

- Forecasts aren't entity attributes (removed in 2024); subscribe with
  `weather/subscribe_forecast` (`forecast_type`: daily, hourly, twice_daily),
  unsubscribe on disconnect, resubscribe on reconnect or type change.
  Unsupported types make the subscription fail.
- Units come from the entity: `temperature_unit`, `pressure_unit`,
  `wind_speed_unit`, `precipitation_unit`, `visibility_unit`. HA has already
  converted values to the user's unit system, so decimals can be long.
- Condition text: `hass.localize("component.weather.entity_component._.state.<state>")`.
  Backend translations like this are loaded at runtime and aren't in the
  frontend translation files; `ui.*` keys are.
- Conditions: clear-night, cloudy, exceptional, fog, hail, lightning,
  lightning-rainy, partlycloudy, pouring, rainy, snowy, snowy-rainy, sunny,
  windy, windy-variant.
- Day/night: `sun.sun` state (`above_horizon`/`below_horizon`) and its
  `next_rising`/`next_setting`; twice daily entries carry `is_daytime`.

**User settings in `hass`**

- `hass.locale`: `language`, `number_format`, `time_format` (12/24/language/
  system), `date_format`, `time_zone` (local/server), `first_weekday`.
  `hass.config.time_zone` is the server's. The card doesn't use
  `number_format` yet, so decimals always use a dot.
- Theme: style with HA's CSS variables (`--primary-text-color`,
  `--primary-color`, `--divider-color`, `--ha-card-*`) so themes and dark mode
  work.

**The editor**

- Fire `config-changed` (bubbles, composed) with the whole config.
- `ha-form` with selectors: `entity` (with `domain`), `select` (`mode: list`
  or `dropdown`, `multiple`), `boolean`, `number` (`mode: box`), `text`,
  `color_rgb` (RGB arrays, not hex), `ui_action` (`default_action`).
  `computeLabel` names the fields.
- `ha-form` sends **every** field on each change. Only store what the user
  actually changed, or defaults end up hard-coded in their config.
- Keep schema objects stable between renders; new objects make ha-form
  rebuild its fields and lose focus.
- Other HA elements: `ha-card`, `ha-expansion-panel`, `ha-entity-picker`,
  `ha-icon`. They exist at runtime only; tests run without them.

**Interaction and accessibility**

- Fire `hass-action` with `{ config, action: "tap" | "hold" | "double_tap" }`
  instead of handling actions yourself. HA reads `config.<action>_action`.
- A clickable card needs `role="button"`, `tabindex="0"`, Enter/Space and a
  visible focus outline, and none of it when there's no action.

## Home Assistant specifics

- Actions are fired as `hass-action` events; HA handles every action type.
  Old `perform_action` (underscore) is normalized to `perform-action`.
- Translations from HA itself: `ui.card.weather.cardinal_direction.<dir>`,
  `ui.card.weather.night`. HA's frontend translation files use flat keys.
- From HA 2026.11, HACS is built in as the **Marketplace** (still reads
  `hacs.json`, category `plugin`). The card supports HA 2026.4+, so docs
  mention both.
- `hass.locale` has `time_format` and `time_zone` (server/local); forecast
  times and night detection follow them.

## Test environment (dev/)

- HA at http://localhost:8123, login skipped from localhost. Dashboard
  "Weather card" (`dev/config/dashboards/weather.yaml`) has a view per area.
- `dev-loader.js` imports the card with `?t=<now>`, because HA serves
  `/local/` with a 31 day cache. Other files in `www/` need a hard refresh.
- `dev-sun-card` renders the card at a fixed `sun: day|night`, with an
  optional `condition`. The Gallery view uses it for the README image.
- `input_number.wind_direction` is a degrees sensor for `custom: wind_bearing`.
- Demo data quirks: North reports pressure in inHg (shows ~33423 hPa) and
  neither demo entity has `wind_bearing`. South has only a daily forecast;
  North has daily, hourly and twice daily.
- Changes to `configuration.yaml` need `docker restart simple-weather-card-ha`.
  Check config with
  `docker exec simple-weather-card-ha python3 -m homeassistant --script check_config -c /config`.

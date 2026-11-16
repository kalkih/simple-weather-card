# Local test environment

A local Home Assistant in Docker with demo weather entities and a dashboard
covering the card's options. The built card in `dist/` is mounted straight in,
so nothing has to be released to test a change.

## Usage

```bash
yarn build          # dist/ must exist before the container starts
yarn ha:up          # start Home Assistant on http://localhost:8123
yarn watch          # rebuild on every change, then hard refresh the browser
```

The first time, Home Assistant asks you to create a user (onboarding). After
that, the login is skipped when opened from localhost.

Open the **Weather card** dashboard in the sidebar. To try the visual editor,
add a card to the default Overview dashboard.

```bash
yarn ha:logs        # follow the Home Assistant log
yarn ha:down        # stop the container
```

## Files

- `config/configuration.yaml`: demo integration, card loaded via
  `frontend.extra_module_url`, and the dashboard below
- `config/dashboards/weather.yaml`: test cards (forecast, backdrop, custom
  sensors, tap actions, ...)

Everything else Home Assistant writes to `config/` is ignored by git. Delete
it to start over from a fresh install.

## README image

The **Gallery** view shows the card's main variants for
`images/gallery.png`, rendered at a fixed time of day by `dev-sun-card` so
the image looks the same whenever it's taken. Set your profile language to
English, collapse the sidebar, and take the two columns of cards with
Cmd+Shift+4 (drag around them).

## Releasing

1. Go to **Actions → Release → Run workflow** on `master`, pick the version
   bump and whether it's a beta.
2. The workflow works out the next version from the tags, checks and builds
   the card, and creates a **draft** release with generated release notes.
3. Review the draft, add highlights at the top if you like, and press
   **Publish**. The tag is created then, and Marketplace (HACS) users get the update.

Betas are tagged `vX.Y.Z-beta-N` and only reach users who enabled beta
versions in the Marketplace (HACS).

Release notes are grouped by pull request label. Labels are set from the
branch name: `feat/…` → Features, `fix/…` → Fixes, `chore/…`, `ci/…`,
`refactor/…` → Maintenance, `docs/…` → Maintenance. Dependabot's pull
requests go under Dependencies.

The version in `package.json` is a placeholder (`0.0.0-dev`). The real
version comes from the tag and is set by the release workflow.

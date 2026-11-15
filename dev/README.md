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

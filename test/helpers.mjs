// Shared helpers for the smoke tests: a fake DOM with the built bundle
// loaded, and a fake Home Assistant to render the card against.
import { readFileSync } from "node:fs";
import { after, before } from "node:test";

import { GlobalRegistrator } from "@happy-dom/global-registrator";

// What the card logs with console.info, like its version banner
export const infoLogs = [];

// Call at the top of every test file; each file runs in its own process.
export const setupDom = () => {
  before(() => {
    GlobalRegistrator.register({ url: "http://localhost:8123/" });
    console.info = (...args) => infoLogs.push(args.join(" "));
    const bundle = readFileSync(
      new URL("../dist/simple-weather-card.js", import.meta.url),
      "utf8",
    );
    new Function(bundle)();
  });

  after(async () => {
    await GlobalRegistrator.unregister();
  });
};

export const ENTITY = "weather.home";

export const FORECAST = {
  daily: Array.from({ length: 7 }, (_, i) => ({
    datetime: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
    condition: "rainy",
    temperature: 10 + i,
    templow: 2 + i,
    precipitation: 1.5,
    precipitation_probability: 60,
  })),
  hourly: Array.from({ length: 24 }, (_, i) => ({
    datetime: new Date(Date.UTC(2026, 0, 1, i)).toISOString(),
    condition: "sunny",
    temperature: 5 + i / 2,
  })),
  twice_daily: Array.from({ length: 8 }, (_, i) => ({
    datetime: new Date(
      Date.UTC(2026, 0, 1 + Math.floor(i / 2), i % 2 ? 18 : 6),
    ).toISOString(),
    is_daytime: i % 2 === 0,
    condition: "sunny",
    temperature: i % 2 ? 2 : 8,
  })),
};

export const weatherState = (attributes = {}) => ({
  state: "rainy",
  attributes: {
    friendly_name: "Home",
    temperature: 7.5,
    temperature_unit: "°C",
    humidity: 80,
    pressure: 1012,
    wind_speed: 4,
    wind_bearing: 200,
    ...attributes,
  },
});

export const subscriptions = [];

export const createHass = (states = {}, forecast = FORECAST) => ({
  states: {
    [ENTITY]: weatherState(),
    "sun.sun": { state: "above_horizon", attributes: {} },
    ...states,
  },
  config: { unit_system: {}, version: "2026.4.0" },
  locale: { language: "en" },
  localize: () => "",
  resources: {},
  connection: {
    haVersion: "2026.4.0",
    subscribeMessage: async (callback, msg) => {
      const sub = { msg, active: true };
      subscriptions.push(sub);
      setTimeout(() => {
        if (sub.active) callback({ forecast: forecast[msg.forecast_type] });
      });
      return () => {
        sub.active = false;
      };
    },
  },
  callService: () => {},
});

export const tick = () => new Promise((resolve) => setTimeout(resolve, 10));

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const createCard = async (config, hass = createHass()) => {
  const card = document.createElement("simple-weather-card");
  card.setConfig({ entity: ENTITY, ...config });
  card.hass = hass;
  document.body.appendChild(card);
  await tick();
  await card.updateComplete;
  return card;
};

export const $ = (card, selector) => card.shadowRoot.querySelector(selector);

export const $$ = (card, selector) =>
  card.shadowRoot.querySelectorAll(selector);

export const text = (card) => card.shadowRoot.textContent.replace(/\s+/g, " ");

export const activeSubscriptions = () =>
  subscriptions.filter((sub) => sub.active);

export const iconUrl = (card) =>
  /url\('([^']*)'\)/.exec($(card, ".weather__icon").getAttribute("style"))?.[1];

export const forecastLabels = (card) =>
  [...$$(card, ".weather__forecast__dayname")].map((el) =>
    el.textContent.trim(),
  );

export const hourlyLabels = async (locale) => {
  subscriptions.length = 0;
  const card = await createCard(
    { show_forecast: true, forecast_type: "hourly" },
    { ...createHass(), locale },
  );
  const labels = forecastLabels(card);
  card.remove();
  return labels;
};

export const collectActions = () => {
  const events = [];
  const listener = (ev) => events.push(ev.detail);
  document.addEventListener("hass-action", listener);
  return {
    events,
    stop: () => document.removeEventListener("hass-action", listener),
  };
};

export const createEditor = async (language) => {
  const editor = await customElements
    .get("simple-weather-card")
    .getConfigElement();
  editor.hass = { ...createHass(), locale: { language } };
  editor.setConfig({ entity: ENTITY });
  document.body.appendChild(editor);
  await editor.updateComplete;
  return editor;
};

export const editorForms = (editor) => [
  ...editor.shadowRoot.querySelectorAll("ha-form"),
];

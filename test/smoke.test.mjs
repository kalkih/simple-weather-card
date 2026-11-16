// Smoke test of the built bundle: loads dist/simple-weather-card.js in a
// fake DOM and renders the card against a fake Home Assistant.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";

import { GlobalRegistrator } from "@happy-dom/global-registrator";

const ENTITY = "weather.home";

const FORECAST = {
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

const weatherState = (attributes = {}) => ({
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

let subscriptions;

const createHass = (states = {}, forecast = FORECAST) => ({
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

const tick = () => new Promise((resolve) => setTimeout(resolve, 10));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createCard = async (config, hass = createHass()) => {
  const card = document.createElement("simple-weather-card");
  card.setConfig({ entity: ENTITY, ...config });
  card.hass = hass;
  document.body.appendChild(card);
  await tick();
  await card.updateComplete;
  return card;
};

const $ = (card, selector) => card.shadowRoot.querySelector(selector);
const $$ = (card, selector) => card.shadowRoot.querySelectorAll(selector);
const text = (card) => card.shadowRoot.textContent.replace(/\s+/g, " ");
const activeSubscriptions = () => subscriptions.filter((sub) => sub.active);

before(() => {
  GlobalRegistrator.register({ url: "http://localhost:8123/" });
  console.info = () => {};
  const bundle = readFileSync(
    new URL("../dist/simple-weather-card.js", import.meta.url),
    "utf8",
  );
  new Function(bundle)();
});

after(async () => {
  await GlobalRegistrator.unregister();
});

test("registers the card and the editor", async () => {
  const Card = customElements.get("simple-weather-card");
  assert.ok(Card, "simple-weather-card is not defined");
  assert.ok(
    window.customCards.some((c) => c.type === "simple-weather-card"),
    "card is not added to window.customCards",
  );
  const editor = await Card.getConfigElement();
  assert.equal(editor.tagName.toLowerCase(), "simple-weather-card-editor");
});

test("renders the current weather", async () => {
  subscriptions = [];
  const card = await createCard({});
  assert.ok($(card, "ha-card"), "ha-card is not rendered");
  assert.match(text(card), /7\.5°C/);
  assert.match(text(card), /Home/);
  assert.match(text(card), /2°C \/ 10°C/, "low / high from forecast");
  card.remove();
});

test("renders a daily forecast", async () => {
  subscriptions = [];
  const card = await createCard({ show_forecast: true });
  assert.equal($$(card, ".weather__forecast__day").length, 5);
  assert.equal($$(card, ".weather__forecast__temp--low").length, 5);
  card.remove();
});

test("renders an hourly forecast", async () => {
  subscriptions = [];
  const card = await createCard({
    show_forecast: true,
    forecast_type: "hourly",
  });
  assert.equal(subscriptions[0].msg.forecast_type, "hourly");
  assert.equal($$(card, ".weather__forecast__day").length, 5);
  assert.equal($$(card, ".weather__forecast__temp--low").length, 0);
  card.remove();
});

test("renders every info attribute", async () => {
  subscriptions = [];
  const card = await createCard({
    primary_info: [
      "extrema",
      "precipitation_and_probability",
      "precipitation",
      "precipitation_probability",
      "apparent_temperature",
    ],
    secondary_info: ["wind", "wind_speed", "wind_bearing", "humidity"],
    state_content: "pressure",
  });
  const output = text(card);
  assert.match(output, /80 %/, "humidity");
  assert.match(output, /1012 hPa/, "pressure");
  assert.match(output, /SSW/, "wind bearing");
  assert.match(output, /\(SSW\)/, "no spaces inside the wind parentheses");
  card.remove();
});

test("does not crash on unknown attributes", async () => {
  subscriptions = [];
  const card = await createCard({
    primary_info: ["not_a_real_attribute", "humidity"],
    state_content: "not_a_real_attribute",
  });
  assert.match(text(card), /80 %/);
  card.remove();
});

test("uses custom sensor overrides", async () => {
  subscriptions = [];
  const hass = createHass({
    "sensor.outside": {
      state: "21.3",
      attributes: { unit_of_measurement: "°C" },
    },
  });
  const card = await createCard({ custom: [{ temp: "sensor.outside" }] }, hass);
  assert.match(text(card), /21\.3°C/);
  card.remove();
});

test("re-renders when the config changes", async () => {
  subscriptions = [];
  const card = await createCard({ name: "Before" });
  card.setConfig({ entity: ENTITY, name: "After" });
  await card.updateComplete;
  assert.match(text(card), /After/);
  assert.doesNotMatch(text(card), /Before/);
  card.remove();
});

test("fires hass-action on tap", async () => {
  subscriptions = [];
  const events = [];
  const listener = (ev) => events.push(ev.detail);
  document.addEventListener("hass-action", listener);

  const card = await createCard({});
  $(card, "ha-card").click();
  card.setConfig({
    entity: ENTITY,
    tap_action: { action: "perform_action", perform_action: "light.toggle" },
  });
  await card.updateComplete;
  $(card, "ha-card").click();

  document.removeEventListener("hass-action", listener);
  card.remove();

  assert.equal(events.length, 2);
  assert.equal(events[0].action, "tap");
  assert.equal(events[0].config.entity, ENTITY);
  assert.equal(events[0].config.tap_action.action, "more-info");
  assert.equal(events[1].config.tap_action.action, "perform-action");
  assert.equal(events[1].config.tap_action.perform_action, "light.toggle");
});

test("manages the forecast subscription", async () => {
  subscriptions = [];
  const hass = createHass();
  const card = await createCard({}, hass);
  assert.equal(activeSubscriptions().length, 1);

  // A state update of the same entity keeps the subscription
  card.hass = {
    ...hass,
    states: { ...hass.states, [ENTITY]: weatherState({ temperature: 9 }) },
  };
  await card.updateComplete;
  assert.equal(subscriptions.length, 1, "resubscribed on a state update");
  assert.match(text(card), /9°C/);

  // Changing the forecast type replaces the subscription
  card.setConfig({ entity: ENTITY, forecast_type: "hourly" });
  await tick();
  assert.equal(subscriptions.length, 2);
  assert.equal(activeSubscriptions().length, 1);
  assert.equal(activeSubscriptions()[0].msg.forecast_type, "hourly");

  // Removing the card unsubscribes, adding it back subscribes again
  card.remove();
  await tick();
  assert.equal(activeSubscriptions().length, 0, "subscription leaked");
  document.body.appendChild(card);
  await tick();
  assert.equal(activeSubscriptions().length, 1, "not resubscribed");
  card.remove();
});

const iconUrl = (card) =>
  /url\('([^']*)'\)/.exec($(card, ".weather__icon").getAttribute("style"))?.[1];

test("inlines SVG icons as valid text data URIs", async () => {
  subscriptions = [];
  const card = await createCard({ animated_icons: true });
  const url = iconUrl(card);
  const prefix = "data:image/svg+xml,";
  assert.ok(url?.startsWith(prefix), `unexpected icon url: ${url}`);
  const svg = decodeURIComponent(url.slice(prefix.length));
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  assert.equal(doc.documentElement.tagName.toLowerCase(), "svg");
  card.remove();
});

test("switches to night icons when the sun sets", async () => {
  subscriptions = [];
  const hass = createHass({ [ENTITY]: { ...weatherState(), state: "sunny" } });
  const card = await createCard({}, hass);
  const dayIcon = iconUrl(card);

  card.hass = {
    ...hass,
    states: {
      ...hass.states,
      "sun.sun": { state: "below_horizon", attributes: {} },
    },
  };
  await card.updateComplete;
  assert.ok(iconUrl(card));
  assert.notEqual(iconUrl(card), dayIcon, "icon did not change at night");
  card.remove();
});

test("applies card-mod only when the config changes", async () => {
  subscriptions = [];
  let applied = 0;
  customElements.define(
    "card-mod",
    class extends HTMLElement {
      static applyToElement() {
        applied++;
      }
    },
  );
  // Let cards from earlier tests, waiting for card-mod, apply first
  await tick();
  applied = 0;

  const hass = createHass();
  const card = await createCard({}, hass);
  await tick();
  assert.equal(applied, 1);

  for (const temperature of [8, 9, 10]) {
    card.hass = {
      ...hass,
      states: { ...hass.states, [ENTITY]: weatherState({ temperature }) },
    };
    await card.updateComplete;
  }
  await tick();
  assert.equal(applied, 1, "card-mod re-applied on state updates");

  card.setConfig({ entity: ENTITY, name: "Changed" });
  await card.updateComplete;
  await tick();
  assert.equal(applied, 2);
  card.remove();
});

test("hides missing values instead of showing 0", async () => {
  subscriptions = [];
  const hass = createHass(
    {
      [ENTITY]: weatherState({
        humidity: undefined,
        pressure: undefined,
        wind_speed: undefined,
        wind_bearing: undefined,
      }),
    },
    { daily: [{ datetime: FORECAST.daily[0].datetime, temperature: 3 }] },
  );
  const card = await createCard(
    {
      primary_info: ["humidity", "pressure", "wind", "wind_bearing"],
      secondary_info: ["precipitation_and_probability", "precipitation"],
    },
    hass,
  );
  assert.equal($$(card, ".weather__info--add .weather__info__item").length, 0);
  assert.doesNotMatch(text(card), /%|hPa|km\/h|mm|unknown/);
  card.remove();
});

test("shows values of 0", async () => {
  subscriptions = [];
  const hass = createHass(
    { [ENTITY]: weatherState({ humidity: 0, wind_speed: 0 }) },
    {
      daily: [
        {
          datetime: FORECAST.daily[0].datetime,
          temperature: 0,
          templow: 0,
          precipitation: 0,
        },
      ],
    },
  );
  const card = await createCard(
    {
      primary_info: ["extrema", "humidity"],
      secondary_info: ["precipitation", "wind_speed"],
    },
    hass,
  );
  const output = text(card);
  assert.match(output, /0°C \/ 0°C/, "extrema");
  assert.match(output, /0 %/, "humidity");
  assert.match(output, /0 mm/, "precipitation");
  assert.match(output, /0 km\/h/, "wind speed");
  card.remove();
});

test("uses night icons for hourly forecast entries at night", async () => {
  subscriptions = [];
  const hourly = FORECAST.hourly.map((entry, i) =>
    i === 0 ? { ...entry, is_daytime: true } : entry,
  );
  const hass = createHass(
    {
      "sun.sun": {
        state: "above_horizon",
        attributes: {
          next_rising: "2026-01-01T07:00:00Z",
          next_setting: "2026-01-01T15:00:00Z",
        },
      },
    },
    { hourly },
  );
  const card = await createCard(
    { show_forecast: true, forecast_type: "hourly" },
    hass,
  );
  // Entries are 00:00-04:00 UTC, before sunrise; the first is marked daytime
  const icons = [...$$(card, ".weather__icon--forecast")].map((el) =>
    el.getAttribute("style"),
  );
  assert.equal(icons.length, 5);
  assert.notEqual(icons[0], icons[1], "night entry uses the day icon");
  assert.equal(icons[1], icons[2]);
  card.remove();
});

test("shows an icon for exceptional weather", async () => {
  subscriptions = [];
  const hass = createHass({
    [ENTITY]: { ...weatherState(), state: "exceptional" },
  });
  const card = await createCard({}, hass);
  assert.ok(
    $(card, ".weather__main > .weather__icon"),
    "no icon for exceptional",
  );
  card.remove();
});

test("provides sizes for masonry and sections dashboards", async () => {
  subscriptions = [];
  const card = await createCard({});
  assert.equal(card.getCardSize(), 2);
  assert.deepEqual(card.getGridOptions(), { columns: 12, min_columns: 6 });
  card.setConfig({ entity: ENTITY, show_forecast: true });
  assert.equal(card.getCardSize(), 4);
  card.remove();
});

test("can be used with the keyboard", async () => {
  subscriptions = [];
  const events = [];
  const listener = (ev) => events.push(ev.detail);
  document.addEventListener("hass-action", listener);

  const card = await createCard({});
  const haCard = $(card, "ha-card");
  assert.equal(haCard.getAttribute("role"), "button");
  assert.equal(haCard.getAttribute("tabindex"), "0");
  haCard.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
  haCard.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
  haCard.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
  assert.equal(events.length, 2);

  card.setConfig({ entity: ENTITY, tap_action: { action: "none" } });
  await card.updateComplete;
  assert.equal(haCard.hasAttribute("role"), false);
  assert.equal(haCard.hasAttribute("tabindex"), false);

  document.removeEventListener("hass-action", listener);
  card.remove();
});

test("editor only stores backdrop colors that were changed", async () => {
  const editor = await customElements
    .get("simple-weather-card")
    .getConfigElement();
  const configs = [];
  editor.addEventListener("config-changed", (ev) =>
    configs.push(ev.detail.config),
  );
  editor.hass = createHass();
  editor.setConfig({ entity: ENTITY, backdrop: { bg: false } });
  document.body.appendChild(editor);
  await editor.updateComplete;

  const form = [...editor.shadowRoot.querySelectorAll("ha-form")].find((f) =>
    f.schema.some((field) => field.name === "bg"),
  );
  const change = (value) =>
    form.dispatchEvent(new CustomEvent("value-changed", { detail: { value } }));

  // Toggling the backdrop keeps the default colors
  change({ ...form.data, bg: true });
  assert.deepEqual(configs.at(-1).backdrop, { bg: true });

  // Changing one color stores only that color
  change({ ...form.data, bg: true, day: [1, 2, 3] });
  assert.deepEqual(configs.at(-1).backdrop, { bg: true, day: "#010203" });
  editor.remove();
});

const forecastLabels = (card) =>
  [...$$(card, ".weather__forecast__dayname")].map((el) =>
    el.textContent.trim(),
  );

const hourlyLabels = async (locale) => {
  subscriptions = [];
  const card = await createCard(
    { show_forecast: true, forecast_type: "hourly" },
    { ...createHass(), locale },
  );
  const labels = forecastLabels(card);
  card.remove();
  return labels;
};

test("follows the user's time format in the hourly forecast", async () => {
  const h12 = await hourlyLabels({ language: "nb", time_format: "12" });
  assert.match(h12[0], /^\d{1,2}\s?(AM|PM|a\.m\.|p\.m\.)$/i, h12[0]);

  const h24 = await hourlyLabels({ language: "en", time_format: "24" });
  assert.match(h24[0], /^\d{2}[:.]\d{2}$/, h24[0]);

  // "language" uses the convention of the user's language
  const en = await hourlyLabels({ language: "en", time_format: "language" });
  assert.match(en[0], /AM|PM/, en[0]);
  const nb = await hourlyLabels({ language: "nb", time_format: "language" });
  assert.match(nb[0], /^\d{2}[:.]\d{2}$/, nb[0]);
});

test("shows the configured number of forecast slots", async () => {
  subscriptions = [];
  const card = await createCard({ show_forecast: true, forecast_slots: 7 });
  assert.equal($$(card, ".weather__forecast__day").length, 7);
  card.setConfig({ entity: ENTITY, show_forecast: true, forecast_slots: 3 });
  await card.updateComplete;
  assert.equal($$(card, ".weather__forecast__day").length, 3);
  card.remove();
});

test("renders a twice daily forecast", async () => {
  subscriptions = [];
  const card = await createCard({
    show_forecast: true,
    forecast_type: "twice_daily",
  });
  assert.equal(subscriptions[0].msg.forecast_type, "twice_daily");
  const labels = forecastLabels(card);
  assert.equal(labels.length, 5);
  assert.equal(labels[1], "Night");
  assert.equal(labels[3], "Night");
  assert.notEqual(labels[0], "Night");

  const icons = [...$$(card, ".weather__icon--forecast")].map((el) =>
    el.getAttribute("style"),
  );
  assert.notEqual(icons[0], icons[1], "night entry uses the day icon");
  // No low temperatures in this forecast, so no low row
  assert.equal($$(card, ".weather__forecast__temp--low").length, 0);
  card.remove();
});

const collectActions = () => {
  const events = [];
  const listener = (ev) => events.push(ev.detail);
  document.addEventListener("hass-action", listener);
  return {
    events,
    stop: () => document.removeEventListener("hass-action", listener),
  };
};

test("fires hold_action on a long press", async () => {
  subscriptions = [];
  const { events, stop } = collectActions();
  const card = await createCard({
    hold_action: { action: "perform_action", perform_action: "light.on" },
  });
  const haCard = $(card, "ha-card");

  haCard.dispatchEvent(new Event("pointerdown"));
  await wait(600);
  haCard.dispatchEvent(new Event("pointerup"));
  haCard.click();
  assert.equal(events.length, 1, "the click ending a hold also tapped");
  assert.equal(events[0].action, "hold");
  assert.equal(events[0].config.hold_action.action, "perform-action");

  // A short press is still a tap
  haCard.dispatchEvent(new Event("pointerdown"));
  await wait(50);
  haCard.dispatchEvent(new Event("pointerup"));
  haCard.click();
  assert.equal(events.length, 2);
  assert.equal(events[1].action, "tap");

  stop();
  card.remove();
});

test("fires double_tap_action on a double tap", async () => {
  subscriptions = [];
  const { events, stop } = collectActions();
  const card = await createCard({
    double_tap_action: { action: "toggle" },
  });
  const haCard = $(card, "ha-card");

  haCard.click();
  haCard.click();
  await wait(300);
  assert.deepEqual(
    events.map((e) => e.action),
    ["double_tap"],
  );

  // A single tap waits to see whether a second one follows
  haCard.click();
  assert.equal(events.length, 1);
  await wait(300);
  assert.equal(events.at(-1).action, "tap");

  stop();
  card.remove();
});

test("is focusable when only a hold action is set", async () => {
  subscriptions = [];
  const card = await createCard({
    tap_action: { action: "none" },
    hold_action: { action: "more-info" },
  });
  assert.equal($(card, "ha-card").getAttribute("role"), "button");
  card.remove();
});

test("shows a custom wind bearing sensor in degrees as a direction", async () => {
  subscriptions = [];
  const hass = createHass({
    "sensor.wind_direction": {
      state: "200",
      attributes: { unit_of_measurement: "°" },
    },
  });
  const card = await createCard(
    {
      primary_info: ["wind_bearing"],
      custom: [{ wind_bearing: "sensor.wind_direction" }],
    },
    hass,
  );
  assert.match(text(card), /SSW/);
  assert.doesNotMatch(text(card), /200/);
  card.remove();
});

test("shows forecast times in the server time zone when chosen", async () => {
  subscriptions = [];
  const hass = {
    ...createHass(),
    config: { ...createHass().config, time_zone: "America/New_York" },
    locale: { language: "nb", time_format: "24", time_zone: "server" },
  };
  const card = await createCard(
    { show_forecast: true, forecast_type: "hourly" },
    hass,
  );
  // The first entry is 00:00 UTC, which is 19:00 in New York
  assert.equal(forecastLabels(card)[0], "19:00");
  card.remove();
});

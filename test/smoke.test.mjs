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

const createHass = (states = {}) => ({
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
        if (sub.active) callback({ forecast: FORECAST[msg.forecast_type] });
      });
      return () => {
        sub.active = false;
      };
    },
  },
  callService: () => {},
});

const tick = () => new Promise((resolve) => setTimeout(resolve, 10));

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
  assert.match(text(card), /7\.5 °C/);
  assert.match(text(card), /Home/);
  assert.match(text(card), /2 °C \/ 10 °C/, "low / high from forecast");
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
  assert.match(text(card), /21\.3 °C/);
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
  assert.match(text(card), /9 °C/);

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

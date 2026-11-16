// Smoke tests of the visual editor, loaded from the built bundle.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

import {
  setupDom,
  ENTITY,
  createHass,
  createEditor,
  editorForms,
} from "./helpers.mjs";

setupDom();

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

test("translates the editor", async () => {
  const editor = await createEditor("nb");
  const headers = [
    ...editor.shadowRoot.querySelectorAll('[slot="header"]'),
  ].map((el) => el.textContent.trim());
  assert.ok(headers.includes("Værvarsel"), headers.join(", "));
  assert.ok(headers.includes("Overstyr med egne sensorer"));

  const form = editorForms(editor).find((f) =>
    f.schema.some((field) => field.name === "forecast_type"),
  );
  assert.equal(form.computeLabel({ name: "show_forecast" }), "Vis værvarsel");
  const type = form.schema.find((field) => field.name === "forecast_type");
  assert.deepEqual(
    type.selector.select.options.map((o) => o.label),
    ["Daglig", "Hver time", "To ganger daglig (dag og natt)"],
  );
  const pickers = [...editor.shadowRoot.querySelectorAll("ha-entity-picker")];
  assert.equal(pickers[0].label, "Temperatur");
  editor.remove();
});

test("falls back to the base language and then English", async () => {
  for (const [language, expected] of [
    ["en-GB", "Forecast"],
    ["fr", "Forecast"],
    ["de-AT", "Vorhersage"],
    ["nb", "Værvarsel"],
    ["nn", "Værvarsel"],
  ]) {
    const editor = await createEditor(language);
    const headers = [
      ...editor.shadowRoot.querySelectorAll('[slot="header"]'),
    ].map((el) => el.textContent.trim());
    assert.ok(headers.includes(expected), `${language}: ${headers}`);
    editor.remove();
  }
});

test("editor uses every translation file", async () => {
  const dir = new URL("../src/translations/", import.meta.url);
  for (const file of readdirSync(dir)) {
    const json = JSON.parse(readFileSync(new URL(file, dir), "utf8"));
    const editor = await createEditor(file.replace(".json", ""));
    const headers = [
      ...editor.shadowRoot.querySelectorAll('[slot="header"]'),
    ].map((el) => el.textContent.trim());
    assert.ok(headers.includes(json.sections.forecast), `${file}: ${headers}`);
    editor.remove();
  }
});

test("editor keeps its schemas between renders", async () => {
  const editor = await createEditor("nb");
  const before = editorForms(editor).map((f) => f.schema);
  editor.setConfig({ entity: ENTITY, name: "Changed" });
  await editor.updateComplete;
  const after = editorForms(editor).map((f) => f.schema);
  assert.equal(after.length, before.length);
  after.forEach((schema, i) => assert.equal(schema, before[i]));
  editor.remove();
});

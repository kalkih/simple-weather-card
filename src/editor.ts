import { LitElement, html, TemplateResult, css, CSSResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { localize } from "./localize";
import { HomeAssistant, CardConfig } from "./types";

const fireEvent = (node: EventTarget, type: string, detail?: unknown): void => {
  node.dispatchEvent(
    new CustomEvent(type, { bubbles: true, composed: true, detail }),
  );
};

type Translate = (key: string) => string;

const INFO_KEYS = [
  "extrema",
  "precipitation_and_probability",
  "precipitation",
  "precipitation_probability",
  "humidity",
  "wind",
  "wind_speed",
  "wind_bearing",
  "pressure",
  "apparent_temperature",
];

const CUSTOM_KEYS = [
  "temp",
  "apparent_temperature",
  "high",
  "low",
  "state",
  "icon-state",
  "precipitation",
  "precipitation_probability",
  "humidity",
  "wind_speed",
  "wind_bearing",
  "pressure",
];

const buildSchemas = (t: Translate) => {
  const infoOptions = INFO_KEYS.map((key) => ({
    value: key,
    label: t(`info.${key}`),
  }));
  const infoSelect = (name: string) => [
    {
      name,
      selector: {
        select: { multiple: true, mode: "list", options: infoOptions },
      },
    },
  ];
  return {
    entity: [
      {
        name: "entity",
        required: true,
        selector: { entity: { domain: "weather" } },
      },
    ],
    name: [
      { name: "show_name", selector: { boolean: {} } },
      { name: "name", selector: { text: {} } },
    ],
    state: [
      {
        name: "state_content",
        selector: {
          select: {
            multiple: false,
            mode: "list",
            options: [
              { value: "state", label: t("info.state") },
              ...infoOptions,
            ],
          },
        },
      },
    ],
    primary_info: infoSelect("primary_info"),
    secondary_info: infoSelect("secondary_info"),
    forecast: [
      { name: "show_forecast", selector: { boolean: {} } },
      {
        name: "forecast_type",
        selector: {
          select: {
            options: ["daily", "hourly", "twice_daily"].map((type) => ({
              value: type,
              label: t(`forecast_type.${type}`),
            })),
          },
        },
      },
      {
        name: "forecast_slots",
        selector: { number: { min: 1, max: 7, mode: "box" } },
      },
    ],
    actions: [
      {
        name: "tap_action",
        selector: { ui_action: { default_action: "more-info" } },
      },
      {
        name: "hold_action",
        selector: { ui_action: { default_action: "none" } },
      },
      {
        name: "double_tap_action",
        selector: { ui_action: { default_action: "none" } },
      },
    ],
    backdrop: [
      { name: "bg", selector: { boolean: {} } },
      { name: "fade", selector: { boolean: {} } },
      { name: "day", selector: { color_rgb: {} } },
      { name: "night", selector: { color_rgb: {} } },
      { name: "text", selector: { color_rgb: {} } },
    ],
    icons: [{ name: "animated_icons", selector: { boolean: {} } }],
  };
};

type Schemas = ReturnType<typeof buildSchemas>;

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
    : [0, 0, 0];
};

const rgbToHex = ([r, g, b]: [number, number, number]): string =>
  "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

const resolveTextColor = (text?: string): [number, number, number] => {
  if (text && /^#/.test(text)) return hexToRgb(text);
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--primary-text-color")
    .trim();
  const hex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(raw);
  if (hex)
    return [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16)];
  const rgb = /rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/.exec(raw);
  if (rgb) return [parseInt(rgb[1]), parseInt(rgb[2]), parseInt(rgb[3])];
  return [255, 255, 255];
};

const toArray = (val: string | string[] | undefined, fallback: string[]) =>
  val === undefined ? fallback : typeof val === "string" ? [val] : val;

const customToMap = (
  custom: Array<Record<string, string>> = [],
): Record<string, string> =>
  Object.fromEntries(custom.map((entry) => Object.entries(entry)[0]));

const mapToCustom = (
  map: Record<string, string>,
): Array<Record<string, string>> =>
  Object.entries(map)
    .filter(([, v]) => Boolean(v))
    .map(([k, v]) => ({ [k]: v }));

@customElement("simple-weather-card-editor")
export class SimpleWeatherCardEditor extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @state() private _config?: CardConfig;
  @state() private _customMap: Record<string, string> = {};

  // Built once per language. New schema objects on every render would make
  // ha-form rebuild its fields, losing focus while typing.
  private _schemaCache?: { language: string; schemas: Schemas };

  static styles: CSSResult = css`
    ha-expansion-panel {
      margin-top: 8px;
    }
    .section-content {
      padding: 8px 16px 16px;
    }
    .custom-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 8px 16px 16px;
    }
  `;

  setConfig(config: CardConfig): void {
    this._customMap = customToMap(config.custom);
    this._config = {
      ...config,
      show_name: config.show_name ?? true,
      tap_action: config.tap_action ?? { action: "more-info" },
      primary_info: toArray(config.primary_info, ["extrema"]),
      secondary_info: toArray(config.secondary_info, ["precipitation"]),
      state_content: config.state_content ?? "state",
      forecast_type: config.forecast_type ?? "daily",
      forecast_slots: config.forecast_slots ?? 5,
    };
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", {
      config: {
        ...this._config,
        ...ev.detail.value,
        custom: mapToCustom(this._customMap),
      },
    });
  }

  // The color pickers need RGB values, so defaults and CSS variables are
  // shown as their resolved color
  private _backdropData(): Record<string, unknown> {
    const backdrop = this._config?.backdrop;
    return {
      ...backdrop,
      day: hexToRgb(backdrop?.day ?? "#45aaf2"),
      night: hexToRgb(backdrop?.night ?? "#a55eea"),
      text: resolveTextColor(backdrop?.text),
    };
  }

  private _backdropChanged(ev: CustomEvent): void {
    const val = ev.detail.value as Record<string, unknown>;
    const shown = this._backdropData();
    const backdrop: Record<string, unknown> = {
      ...this._config?.backdrop,
      ...val,
    };
    // ha-form sends every field, so only store colors the user changed.
    // Otherwise defaults and CSS variables are replaced by a fixed color.
    for (const key of ["day", "night", "text"] as const) {
      const rgb = val[key];
      const changed =
        Array.isArray(rgb) && rgb.join() !== (shown[key] as number[]).join();
      const current = this._config?.backdrop?.[key];
      if (changed) backdrop[key] = rgbToHex(rgb as [number, number, number]);
      else if (current !== undefined) backdrop[key] = current;
      else delete backdrop[key];
    }
    fireEvent(this, "config-changed", {
      config: {
        ...this._config,
        backdrop,
        custom: mapToCustom(this._customMap),
      },
    });
  }

  private _customChanged(key: string, ev: CustomEvent): void {
    const value = (ev.detail.value as string) ?? "";
    const newMap = { ...this._customMap, [key]: value };
    if (!value) delete newMap[key];
    this._customMap = newMap;
    fireEvent(this, "config-changed", {
      config: { ...this._config!, custom: mapToCustom(newMap) },
    });
  }

  private _t = (key: string): string => localize(this.hass, key);

  private _computeLabel = (schema: { name: string }): string =>
    this._t(`fields.${schema.name}`);

  private get _schemas(): Schemas {
    const language = this.hass.locale?.language ?? "en";
    if (this._schemaCache?.language !== language) {
      this._schemaCache = { language, schemas: buildSchemas(this._t) };
    }
    return this._schemaCache.schemas;
  }

  private _section(
    icon: string,
    section: keyof Schemas,
    data: unknown = this._config,
    onChange: (ev: CustomEvent) => void = this._valueChanged,
  ): TemplateResult {
    return html`
      <ha-expansion-panel outlined>
        <span slot="header"
          ><ha-icon icon=${icon}></ha-icon>
          ${this._t(`sections.${section}`)}</span
        >
        <div class="section-content">
          <ha-form
            .hass=${this.hass}
            .data=${data}
            .schema=${this._schemas[section]}
            .computeLabel=${this._computeLabel}
            @value-changed=${onChange}
          ></ha-form>
        </div>
      </ha-expansion-panel>
    `;
  }

  protected render(): TemplateResult | string {
    if (!this._config || !this.hass) return "";
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${this._schemas.entity}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
      ${this._section("mdi:format-header-1", "name")}
      ${this._section("mdi:text", "state")}
      ${this._section("mdi:format-list-bulleted", "primary_info")}
      ${this._section("mdi:format-list-bulleted", "secondary_info")}
      ${this._section("mdi:weather-partly-cloudy", "forecast")}
      ${this._section("mdi:gesture-tap", "actions")}
      ${this._section(
        "mdi:palette",
        "backdrop",
        this._backdropData(),
        this._backdropChanged,
      )}
      ${this._section("mdi:animation", "icons")}
      <ha-expansion-panel outlined>
        <span slot="header"
          ><ha-icon icon="mdi:cog"></ha-icon>
          ${this._t("sections.custom")}</span
        >
        <div class="custom-content">
          ${CUSTOM_KEYS.map(
            (key) => html`
              <ha-entity-picker
                .hass=${this.hass}
                .label=${this._t(`custom.${key}`)}
                .value=${this._customMap[key] ?? ""}
                @value-changed=${(ev: CustomEvent) =>
                  this._customChanged(key, ev)}
              ></ha-entity-picker>
            `,
          )}
        </div>
      </ha-expansion-panel>
    `;
  }
}

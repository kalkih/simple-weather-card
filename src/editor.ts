import { LitElement, html, TemplateResult, css, CSSResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { HomeAssistant, CardConfig } from "./types";

const fireEvent = (node: EventTarget, type: string, detail?: unknown): void => {
  node.dispatchEvent(
    new CustomEvent(type, { bubbles: true, composed: true, detail }),
  );
};

const INFO_OPTIONS = [
  { value: "extrema", label: "Low / High" },
  {
    value: "precipitation_and_probability",
    label: "Precipitation (Amount / Probability)",
  },
  { value: "precipitation", label: "Precipitation" },
  { value: "precipitation_probability", label: "Precipitation probability" },
  { value: "humidity", label: "Humidity" },
  { value: "wind", label: "Wind (Speed / Bearing)" },
  { value: "wind_speed", label: "Wind speed" },
  { value: "wind_bearing", label: "Wind bearing" },
  { value: "pressure", label: "Pressure" },
  { value: "apparent_temperature", label: "Feels like" },
];

const CUSTOM_KEYS: { key: string; label: string }[] = [
  { key: "temp", label: "Temperature" },
  { key: "apparent_temperature", label: "Feels like" },
  { key: "high", label: "High temperature" },
  { key: "low", label: "Low temperature" },
  { key: "state", label: "Condition / state" },
  { key: "icon-state", label: "Icon state" },
  { key: "precipitation", label: "Precipitation" },
  { key: "precipitation_probability", label: "Precipitation probability" },
  { key: "humidity", label: "Humidity" },
  { key: "wind_speed", label: "Wind speed" },
  { key: "wind_bearing", label: "Wind bearing" },
  { key: "pressure", label: "Pressure" },
];

const ENTITY_SCHEMA = [
  {
    name: "entity",
    required: true,
    selector: { entity: { domain: "weather" } },
  },
];

const NAME_SCHEMA = [
  { name: "show_name", selector: { boolean: {} } },
  { name: "name", selector: { text: {} } },
];

const PRIMARY_INFO_SCHEMA = [
  {
    name: "primary_info",
    selector: {
      select: { multiple: true, mode: "list", options: INFO_OPTIONS },
    },
  },
];

const SECONDARY_INFO_SCHEMA = [
  {
    name: "secondary_info",
    selector: {
      select: { multiple: true, mode: "list", options: INFO_OPTIONS },
    },
  },
];

const STATE_CONTENT_OPTIONS = [
  { value: "state", label: "Weather condition" },
  ...INFO_OPTIONS,
];

const STATE_CONTENT_SCHEMA = [
  {
    name: "state_content",
    selector: {
      select: { multiple: false, mode: "list", options: STATE_CONTENT_OPTIONS },
    },
  },
];

const FORECAST_SCHEMA = [
  { name: "show_forecast", selector: { boolean: {} } },
  {
    name: "forecast_type",
    selector: {
      select: {
        options: [
          { value: "daily", label: "Daily" },
          { value: "hourly", label: "Hourly" },
          { value: "twice_daily", label: "Twice daily (day and night)" },
        ],
      },
    },
  },
  {
    name: "forecast_slots",
    selector: { number: { min: 1, max: 12, mode: "box" } },
  },
];

const ACTIONS_SCHEMA = [
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
];

const BACKDROP_SCHEMA = [
  { name: "bg", selector: { boolean: {} } },
  { name: "fade", selector: { boolean: {} } },
  { name: "day", selector: { color_rgb: {} } },
  { name: "night", selector: { color_rgb: {} } },
  { name: "text", selector: { color_rgb: {} } },
];

const ICONS_SCHEMA = [{ name: "animated_icons", selector: { boolean: {} } }];

const LABELS: Record<string, string> = {
  entity: "Weather entity",
  name: "Name",
  show_name: "Show name",
  show_forecast: "Show forecast",
  forecast_type: "Forecast type",
  forecast_slots: "Number of days / hours",
  tap_action: "Tap action",
  hold_action: "Hold action",
  double_tap_action: "Double tap action",
  bg: "Show backdrop",
  primary_info: "Primary info",
  secondary_info: "Secondary info",
  backdrop: "Backdrop",
  day: "Day color",
  night: "Night color",
  text: "Text color",
  fade: "Fade effect",
  animated_icons: "Animated icons",
  state_content: "State content",
};

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

  private _computeLabel(schema: { name: string; title?: string }): string {
    return LABELS[schema.name] ?? schema.title ?? schema.name;
  }

  protected render(): TemplateResult | string {
    if (!this._config || !this.hass) return "";
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${ENTITY_SCHEMA}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <ha-expansion-panel outlined>
        <span slot="header"
          ><ha-icon icon="mdi:format-header-1"></ha-icon> Name</span
        >
        <div class="section-content">
          <ha-form
            .hass=${this.hass}
            .data=${this._config}
            .schema=${NAME_SCHEMA}
            .computeLabel=${this._computeLabel}
            @value-changed=${this._valueChanged}
          ></ha-form>
        </div>
      </ha-expansion-panel>
      <ha-expansion-panel outlined>
        <span slot="header"
          ><ha-icon icon="mdi:text"></ha-icon> State info</span
        >
        <div class="section-content">
          <ha-form
            .hass=${this.hass}
            .data=${this._config}
            .schema=${STATE_CONTENT_SCHEMA}
            .computeLabel=${this._computeLabel}
            @value-changed=${this._valueChanged}
          ></ha-form>
        </div>
      </ha-expansion-panel>
      <ha-expansion-panel outlined>
        <span slot="header"
          ><ha-icon icon="mdi:format-list-bulleted"></ha-icon> Primary
          info</span
        >
        <div class="section-content">
          <ha-form
            .hass=${this.hass}
            .data=${this._config}
            .schema=${PRIMARY_INFO_SCHEMA}
            .computeLabel=${this._computeLabel}
            @value-changed=${this._valueChanged}
          ></ha-form>
        </div>
      </ha-expansion-panel>
      <ha-expansion-panel outlined>
        <span slot="header"
          ><ha-icon icon="mdi:format-list-bulleted"></ha-icon> Secondary
          info</span
        >
        <div class="section-content">
          <ha-form
            .hass=${this.hass}
            .data=${this._config}
            .schema=${SECONDARY_INFO_SCHEMA}
            .computeLabel=${this._computeLabel}
            @value-changed=${this._valueChanged}
          ></ha-form>
        </div>
      </ha-expansion-panel>
      <ha-expansion-panel outlined>
        <span slot="header"
          ><ha-icon icon="mdi:weather-partly-cloudy"></ha-icon> Forecast</span
        >
        <div class="section-content">
          <ha-form
            .hass=${this.hass}
            .data=${this._config}
            .schema=${FORECAST_SCHEMA}
            .computeLabel=${this._computeLabel}
            @value-changed=${this._valueChanged}
          ></ha-form>
        </div>
      </ha-expansion-panel>
      <ha-expansion-panel outlined>
        <span slot="header"
          ><ha-icon icon="mdi:gesture-tap"></ha-icon> Actions</span
        >
        <div class="section-content">
          <ha-form
            .hass=${this.hass}
            .data=${this._config}
            .schema=${ACTIONS_SCHEMA}
            .computeLabel=${this._computeLabel}
            @value-changed=${this._valueChanged}
          ></ha-form>
        </div>
      </ha-expansion-panel>
      <ha-expansion-panel outlined>
        <span slot="header"
          ><ha-icon icon="mdi:palette"></ha-icon> Backdrop</span
        >
        <div class="section-content">
          <ha-form
            .hass=${this.hass}
            .data=${this._backdropData()}
            .schema=${BACKDROP_SCHEMA}
            .computeLabel=${this._computeLabel}
            @value-changed=${this._backdropChanged}
          ></ha-form>
        </div>
      </ha-expansion-panel>
      <ha-expansion-panel outlined>
        <span slot="header"
          ><ha-icon icon="mdi:animation"></ha-icon> Icons</span
        >
        <div class="section-content">
          <ha-form
            .hass=${this.hass}
            .data=${this._config}
            .schema=${ICONS_SCHEMA}
            .computeLabel=${this._computeLabel}
            @value-changed=${this._valueChanged}
          ></ha-form>
        </div>
      </ha-expansion-panel>
      <ha-expansion-panel outlined>
        <span slot="header"
          ><ha-icon icon="mdi:cog"></ha-icon> Custom sensor overrides</span
        >
        <div class="custom-content">
          ${CUSTOM_KEYS.map(
            ({ key, label }) => html`
              <ha-entity-picker
                .hass=${this.hass}
                .label=${label}
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

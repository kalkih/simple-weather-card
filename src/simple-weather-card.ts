import { LitElement, html, nothing, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import WeatherEntity, { getTimeZone } from "./weather";
import getStyles from "./style";
import { ActionType, handleClick, hasAction } from "./handleClick";
import {
  HomeAssistant,
  HassEntity,
  ForecastEntry,
  CardConfig,
  NormalizedConfig,
  CustomMap,
} from "./types";
import { version } from "./var/version";

declare global {
  interface Window {
    customCards?: Array<{
      type: string;
      name: string;
      preview: boolean;
      description: string;
    }>;
  }
}

const UNITS: Record<string, string> = {
  celsius: "°C",
  fahrenheit: "°F",
};

const hasValue = (val: unknown): boolean =>
  val !== undefined && val !== null && val !== "";

const HOLD_TIME = 500;
const DOUBLE_TAP_TIME = 250;

// Follows the time format chosen in the user's Home Assistant profile
const use12HourClock = (locale: HomeAssistant["locale"]): boolean => {
  if (locale.time_format === "12") return true;
  if (locale.time_format === "24") return false;
  const language =
    locale.time_format === "system" ? undefined : locale.language;
  return (
    new Intl.DateTimeFormat(language, { hour: "numeric" }).resolvedOptions()
      .hour12 ?? false
  );
};

const toArray = (
  val: string | string[] | undefined,
  fallback: string[],
): string[] => {
  if (val === undefined) return fallback;
  return typeof val === "string" ? [val] : val;
};

const INFO: Record<string, { icon?: string; unit: string }> = {
  precipitation: { icon: "rainy", unit: "precipitation" },
  precipitation_probability: { icon: "rainy", unit: "%" },
  humidity: { icon: "humidity", unit: "%" },
  wind_speed: { icon: "windy", unit: "wind_speed" },
  wind_bearing: { icon: "windy", unit: "" },
  pressure: { icon: "pressure", unit: "pressure" },
  apparent_temperature: { unit: "temperature" },
};

@customElement("simple-weather-card")
export class SimpleWeatherCard extends LitElement {
  @property({ type: Object }) entity?: HassEntity;
  @state() private weather?: WeatherEntity;
  @state() private custom: CustomMap = {};

  @state() private config!: NormalizedConfig;

  private _hass?: HomeAssistant;
  private _forecast: ForecastEntry[] = [];
  private _forecastSubscription?: Promise<() => void>;
  private _subscribedTo?: string;
  private _sunState?: string;
  private _holdTimer?: number;
  private _held = false;
  private _tapTimer?: number;

  static styles = getStyles();

  static async getConfigElement(): Promise<HTMLElement> {
    await import(/* webpackMode: "eager" */ "./editor");
    return document.createElement("simple-weather-card-editor");
  }

  // Masonry dashboards, in units of 50px
  getCardSize(): number {
    return this.config.show_forecast ? 4 : 2;
  }

  // Sections dashboards. Rows are left to the default, which sizes the
  // card to its content.
  getGridOptions(): { columns: number; min_columns: number } {
    return { columns: 12, min_columns: 6 };
  }

  static getStubConfig(hass: HomeAssistant): Partial<CardConfig> {
    const entity = Object.keys(hass.states).find((e) =>
      e.startsWith("weather."),
    );
    return { entity };
  }

  set hass(hass: HomeAssistant) {
    const { custom, entity } = this.config;

    this._hass = hass;
    const entityObj = hass.states[entity];
    const sunState = hass.states["sun.sun"]?.state;
    if (entityObj && this.isConnected) {
      this._subscribeForecasts();
    }
    // Also rebuild when the sun changes, so day/night icons follow it
    if (
      entityObj &&
      (this.entity !== entityObj || this._sunState !== sunState)
    ) {
      this.entity = entityObj;
      this._sunState = sunState;
      this.weather = new WeatherEntity(hass, entityObj, this._forecast);
    }
    const newCustom: CustomMap = {};
    custom.forEach((ele) => {
      const [key, sensor] = Object.entries(ele)[0];
      if (hass.states[sensor]) {
        const entry = hass.states[sensor];
        if (this.custom[key]?.state !== entry.state) {
          newCustom[key] = {
            state: entry.state,
            unit: entry.attributes.unit_of_measurement as string | undefined,
          };
        }
      }
    });
    if (Object.keys(newCustom).length > 0) {
      this.custom = { ...this.custom, ...newCustom };
    }
  }

  get hass(): HomeAssistant {
    return this._hass!;
  }

  connectedCallback(): void {
    super.connectedCallback();
    if (this._hass && this.entity) {
      this._subscribeForecasts();
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribeForecasts();
  }

  private _unsubscribeForecasts(): void {
    this._forecastSubscription?.then((unsub) => unsub()).catch(() => {});
    this._forecastSubscription = undefined;
    this._subscribedTo = undefined;
  }

  private _subscribeForecasts(): void {
    const { entity, forecast_type } = this.config;
    const key = `${entity}:${forecast_type}`;
    if (this._subscribedTo === key) return;

    this._unsubscribeForecasts();
    this._subscribedTo = key;
    this._forecast = [];

    const subscription = this._hass!.connection.subscribeMessage<{
      forecast: ForecastEntry[] | null;
    }>(
      (msg) => {
        // Ignore messages from a subscription that has been replaced
        if (this._forecastSubscription !== subscription) return;
        this._forecast = msg.forecast ?? [];
        if (this.entity) {
          this.weather = new WeatherEntity(
            this._hass!,
            this.entity,
            this._forecast,
          );
        }
      },
      {
        type: "weather/subscribe_forecast",
        forecast_type,
        entity_id: entity,
      },
    );
    this._forecastSubscription = subscription;
    subscription.catch(() => {
      if (this._forecastSubscription === subscription) {
        this._forecastSubscription = undefined;
        this._subscribedTo = undefined;
      }
    });
  }

  private get name(): string {
    return this.config.name || this.weather?.name || "";
  }

  setConfig(config: CardConfig): void {
    if (!config.entity) throw new Error("Specify an entity.");

    this.config = {
      entity: config.entity,
      name: config.name,
      show_name: config.show_name ?? true,
      primary_info: toArray(config.primary_info, ["extrema"]),
      secondary_info: toArray(config.secondary_info, ["precipitation"]),
      state_content: config.state_content ?? "state",
      custom: config.custom ?? [],
      tap_action: config.tap_action ?? { action: "more-info" },
      hold_action: config.hold_action,
      double_tap_action: config.double_tap_action,
      backdrop: {
        bg: config.backdrop?.bg ?? false,
        day: "#45aaf2",
        night: "#a55eea",
        text: "var(--text-dark-color)",
        fade: false,
        ...config.backdrop,
      },
      show_forecast: config.show_forecast ?? false,
      forecast_type: config.forecast_type ?? "daily",
      forecast_slots: config.forecast_slots ?? 5,
      animated_icons: config.animated_icons ?? false,
      card_mod: config.card_mod,
      uix: config.uix,
    };
    if (this._hass) {
      // Re-run the hass setter to pick up a changed entity or forecast type
      this.hass = this._hass;
    }
  }

  protected shouldUpdate(changedProps: Map<string, unknown>): boolean {
    return ["config", "entity", "custom", "weather"].some((prop) =>
      changedProps.has(prop),
    );
  }

  protected updated(changedProps: PropertyValues): void {
    if (!changedProps.has("config")) return;
    this._applyCardMod();
    this._applyUix();
  }

  private _applyCardMod(): void {
    this._applyToElement("card-mod", this.config.card_mod);
  }

  private _applyUix(): void {
    this._applyToElement("uix-node", this.config.uix);
  }

  // Look the class up instead of relying on the value `whenDefined`
  // resolves with, which is undefined in some browsers
  private _applyToElement(tag: string, styleConfig: unknown): void {
    customElements.whenDefined(tag).then(() => {
      const element = customElements.get(tag) as unknown as {
        applyToElement: (...args: unknown[]) => void;
      };
      element.applyToElement(
        this,
        "card",
        styleConfig,
        { config: this.config },
        true,
        "type-custom-simple-weather-card",
      );
    });
  }

  protected render(): TemplateResult {
    const actionable =
      hasAction(this.config.tap_action) ||
      hasAction(this.config.hold_action) ||
      hasAction(this.config.double_tap_action);
    return html`
      <ha-card
        role=${actionable ? "button" : nothing}
        tabindex=${actionable ? "0" : nothing}
        ?bg=${this.config.backdrop.bg}
        ?fade=${this.config.backdrop.fade}
        ?night=${this.weather?.isNight}
        style="--day-color: ${this.config.backdrop.day}; --night-color: ${
          this.config.backdrop.night
        }; --text-color: ${this.config.backdrop.text};"
        @click=${this.handleCardClick}
        @keydown=${this.handleKeyDown}
        @pointerdown=${this.handlePointerDown}
        @pointerup=${this.cancelHold}
        @pointercancel=${this.cancelHold}
        @pointerleave=${this.cancelHold}
        @contextmenu=${this.handleContextMenu}
      >
        <div class="weather__main">
          ${this.renderIcon()}
          <div class="weather__info">
            <span class="weather__info__title">
              ${this.renderAttr("temp")}
              ${this.config.show_name ? this.name : ""}
            </span>
            <span class="weather__info__state">
              ${this.renderStateContent()}
            </span>
          </div>
          <div class="weather__info weather__info--add">
            ${this.renderInfoRow(this.config.primary_info)}
            ${this.renderInfoRow(this.config.secondary_info)}
          </div>
        </div>
        ${this.config.show_forecast ? this.renderForecast() : ""}
      </ha-card>
    `;
  }

  private _getIcon(
    iconName: string,
    night = this.weather?.isNight ?? false,
  ): string {
    if (this.config.animated_icons) {
      return this.weather?.getAnimatedIcon(iconName, night) ?? "";
    }
    return this.weather?.getIcon(iconName, night) ?? "";
  }

  private _getStateIcon(): string | undefined {
    return this.config.animated_icons
      ? this.weather?.iconAnimated
      : this.weather?.icon;
  }

  private renderIcon(): TemplateResult | string {
    const icon = this.custom["icon-state"]
      ? this._getIcon(this.custom["icon-state"].state)
      : this._getStateIcon();
    return this.weather?.hasState && icon
      ? html`<div
          class="weather__icon"
          style="background-image: url('${icon}')"
        ></div>`
      : "";
  }

  private renderPrecipitation(): TemplateResult | string {
    const precip =
      this.custom.precipitation?.state ??
      this.weather?.getAttribute("precipitation");
    const prob =
      this.custom.precipitation_probability?.state ??
      this.weather?.getAttribute("precipitation_probability");
    return hasValue(precip) || hasValue(prob)
      ? html`
          <span class="weather__info__item">
            <div
              class="weather__icon weather__icon--small"
              style="background-image: url('${this.weather?.getIcon("rainy")}')"
            ></div>
            ${this.renderAttr("precipitation")}${
              hasValue(precip) && hasValue(prob)
                ? html` / ${this.renderAttr("precipitation_probability")}`
                : ""
            }
          </span>
        `
      : "";
  }

  private renderWind(): TemplateResult | string {
    const speed =
      this.custom.wind_speed?.state ?? this.weather?.getAttribute("wind_speed");
    const bearing =
      this.custom.wind_bearing?.state ??
      this.weather?.getAttribute("wind_bearing");
    return hasValue(speed) || hasValue(bearing)
      ? html`
          <span class="weather__info__item">
            <div
              class="weather__icon weather__icon--small"
              style="background-image: url('${this.weather?.getIcon("windy")}')"
            ></div>
            ${this.renderAttr("wind_speed")}${
              hasValue(speed) && hasValue(bearing)
                ? html`(${this.formatAttr("wind_bearing")})`
                : ""
            }
          </span>
        `
      : "";
  }

  private renderExtrema(): TemplateResult | string {
    const high = this.custom.high?.state ?? this.weather?.high;
    const low = this.custom.low?.state ?? this.weather?.low;
    return hasValue(high) || hasValue(low)
      ? html`
          <span class="weather__info__item">
            ${this.renderAttr("low")}
            ${hasValue(high) && hasValue(low) ? " / " : ""}
            ${this.renderAttr("high")}
          </span>
        `
      : "";
  }

  private renderStateContent(): TemplateResult | string {
    const attr = this.config.state_content;
    if (attr === "state") return html`${this.renderAttr("state", false)}`;
    return html`${this.renderInfo(attr)}`;
  }

  private renderInfoRow(attrs: string[]): TemplateResult {
    return html`
      <div class="weather__info__row">
        ${attrs.map((attr) => this.renderInfo(attr))}
      </div>
    `;
  }

  private renderInfo(attr: string): TemplateResult | string {
    if (attr === "extrema") return this.renderExtrema();
    if (attr === "precipitation_and_probability")
      return this.renderPrecipitation();
    if (attr === "wind") return this.renderWind();
    const icon = INFO[attr]?.icon;
    const value = this.custom[attr]?.state ?? this.weather?.getAttribute(attr);
    if (!hasValue(value)) return "";
    return html`
      <span class="weather__info__item">
        ${
          icon
            ? html`<div
                class="weather__icon weather__icon--small"
                style="background-image: url('${this.weather?.getIcon(icon)}')"
              ></div>`
            : ""
        }
        ${this.renderAttr(attr)}
      </span>
    `;
  }

  private renderForecast(): TemplateResult {
    const type = this.config.forecast_type;
    const isHourly = type === "hourly";
    const entries = this._forecast.slice(0, this.config.forecast_slots);
    const tempUnit = this.getUnit("temperature");
    const lang = this.hass.locale.language;
    const hour12 = use12HourClock(this.hass.locale);
    const timeZone = getTimeZone(this.hass);
    const nightLabel = this.hass.localize("ui.card.weather.night") || "Night";
    const showLow =
      type === "daily" ||
      (type === "twice_daily" &&
        entries.some((entry) => entry.templow !== undefined));
    return html`
      <div class="weather__forecast">
        ${entries.map((entry) => {
          const date = entry.datetime ? new Date(entry.datetime) : null;
          // Daily entries have no meaningful time of day, so use day icons
          const night = type !== "daily" && !!this.weather?.isNightAt(entry);
          let label = "";
          if (date && isHourly) {
            label = date.toLocaleTimeString(
              lang,
              hour12
                ? { hour: "numeric", hour12, timeZone }
                : { hour: "2-digit", minute: "2-digit", hour12, timeZone },
            );
          } else if (date) {
            label =
              type === "twice_daily" && night
                ? nightLabel
                : date.toLocaleDateString(lang, { weekday: "short", timeZone });
          }
          const icon = entry.condition
            ? this._getIcon(entry.condition, night)
            : undefined;
          return html`
            <div class="weather__forecast__day">
              <span class="weather__forecast__dayname">${label}</span>
              ${
                icon
                  ? html`<div
                      class="weather__icon weather__icon--forecast"
                      style="background-image: url('${icon}')"
                    ></div>`
                  : ""
              }
              <span
                class="weather__forecast__temp weather__forecast__temp--high"
              >
                ${
                  entry.temperature !== undefined
                    ? entry.temperature.toFixed(1)
                    : "--"
                }${tempUnit}
              </span>
              ${
                showLow
                  ? html`<span
                      class="weather__forecast__temp weather__forecast__temp--low"
                    >
                      ${
                        entry.templow !== undefined
                          ? entry.templow.toFixed(1)
                          : "--"
                      }${tempUnit}
                    </span>`
                  : ""
              }
            </div>
          `;
        })}
      </div>
    `;
  }

  private renderAttr(attr: string, uom = true): TemplateResult | undefined {
    const text = this.formatAttr(attr, uom);
    return text !== undefined ? html` ${text} ` : undefined;
  }

  private formatAttr(attr: string, uom = true): string | undefined {
    const weatherValue = this.weather?.getAttribute(attr);
    const state = this.custom[attr] ? this.custom[attr].state : weatherValue;
    if (!hasValue(state)) return undefined;
    let value = state;
    let unit = uom
      ? this.getUnit(this.custom[attr]?.unit ?? INFO[attr]?.unit)
      : "";
    // Custom wind bearing sensors usually report degrees
    if (
      attr === "wind_bearing" &&
      this.custom[attr] &&
      this.weather &&
      Number.isFinite(Number(state))
    ) {
      value = this.weather.degToDirection(Number(state));
      unit = "";
    }
    // Degrees read better without a space: 21.6°C
    const separator = unit.startsWith("°") ? "" : " ";
    return `${value}${unit ? separator + unit : ""}`;
  }

  private handleAction(action: ActionType): void {
    handleClick(this, this.config, action);
  }

  private handleCardClick(): void {
    // The click that ends a hold shouldn't also count as a tap
    if (this._held) {
      this._held = false;
      return;
    }
    if (!hasAction(this.config.double_tap_action)) {
      this.handleAction("tap");
      return;
    }
    // Wait briefly to see whether a second tap follows
    if (this._tapTimer !== undefined) {
      clearTimeout(this._tapTimer);
      this._tapTimer = undefined;
      this.handleAction("double_tap");
    } else {
      this._tapTimer = window.setTimeout(() => {
        this._tapTimer = undefined;
        this.handleAction("tap");
      }, DOUBLE_TAP_TIME);
    }
  }

  private handlePointerDown(): void {
    this._held = false;
    if (!hasAction(this.config.hold_action)) return;
    this._holdTimer = window.setTimeout(() => {
      this._held = true;
      this.handleAction("hold");
    }, HOLD_TIME);
  }

  private cancelHold(): void {
    clearTimeout(this._holdTimer);
    this._holdTimer = undefined;
  }

  // Long-pressing on touch screens opens the context menu otherwise
  private handleContextMenu(ev: Event): void {
    if (hasAction(this.config.hold_action)) ev.preventDefault();
  }

  private handleKeyDown(ev: KeyboardEvent): void {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    ev.preventDefault();
    this.handleAction("tap");
  }

  private getUnit(unit = "temperature"): string {
    const attr = this.entity?.attributes;
    switch (unit) {
      case "temperature":
        return (attr?.temperature_unit as string) || UNITS.celsius;
      case "precipitation":
        return (attr?.precipitation_unit as string) || "mm";
      case "wind_speed":
        return (attr?.wind_speed_unit as string) || "km/h";
      case "pressure":
        return (attr?.pressure_unit as string) || "hPa";
      default:
        return unit;
    }
  }
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "simple-weather-card",
  name: "Simple Weather Card",
  preview: true,
  description: "A minimalistic weather card for Home Assistant",
});

console.info(
  `%c Simple Weather Card %c ${version} `,
  "background-color: #555;color: #fff;padding: 3px 2px 3px 3px;border-radius: 14px 0 0 14px;font-family: DejaVu Sans,Verdana,Geneva,sans-serif;text-shadow: 0 1px 0 rgba(1, 1, 1, 0.3)",
  "background-color: #506eac;color: #fff;padding: 3px 3px 3px 2px;border-radius: 0 14px 14px 0;font-family: DejaVu Sans,Verdana,Geneva,sans-serif;text-shadow: 0 1px 0 rgba(1, 1, 1, 0.3)",
);

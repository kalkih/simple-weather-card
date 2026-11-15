import { LitElement, html, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import WeatherEntity from "./weather";
import getStyles from "./style";
import { handleClick } from "./handleClick";
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

  static styles = getStyles();

  static async getConfigElement(): Promise<HTMLElement> {
    await import(/* webpackMode: "eager" */ "./editor");
    return document.createElement("simple-weather-card-editor");
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
    if (entityObj && this.isConnected) {
      this._subscribeForecasts();
    }
    if (entityObj && this.entity !== entityObj) {
      this.entity = entityObj;
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

  protected updated(): void {
    this._applyCardMod();
    this._applyUix();
  }

  private _applyCardMod(): void {
    customElements.whenDefined("card-mod").then((CardMod: unknown) => {
      (
        CardMod as { applyToElement: (...args: unknown[]) => void }
      ).applyToElement(
        this,
        "card",
        this.config.card_mod,
        { config: this.config },
        true,
        "type-custom-simple-weather-card",
      );
    });
  }

  private _applyUix(): void {
    customElements.whenDefined("uix-node").then((uix: unknown) => {
      (uix as { applyToElement: (...args: unknown[]) => void }).applyToElement(
        this,
        "card",
        this.config.uix,
        { config: this.config },
        true,
        "type-custom-simple-weather-card",
      );
    });
  }

  protected render(): TemplateResult {
    return html`
      <ha-card
        ?bg=${this.config.backdrop.bg}
        ?fade=${this.config.backdrop.fade}
        ?night=${this.weather?.isNight}
        style="--day-color: ${this.config.backdrop.day}; --night-color: ${
          this.config.backdrop.night
        }; --text-color: ${this.config.backdrop.text};"
        @click=${() => this.handleTap()}
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

  private _getIcon(iconName: string): string {
    if (this.config.animated_icons) {
      return this.weather?.getAnimatedIcon(iconName) ?? "";
    }
    return this.weather?.getIcon(iconName) ?? "";
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
          style="background-image: url(${icon})"
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
    return precip || prob
      ? html`
          <span class="weather__info__item">
            <div
              class="weather__icon weather__icon--small"
              style="background-image: url(${this.weather?.getIcon("rainy")})"
            ></div>
            ${this.renderAttr("precipitation")}${
              precip && prob
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
    return speed || bearing
      ? html`
          <span class="weather__info__item">
            <div
              class="weather__icon weather__icon--small"
              style="background-image: url(${this.weather?.getIcon("windy")})"
            ></div>
            ${this.renderAttr("wind_speed")}${
              speed && bearing ? html`(${this.renderAttr("wind_bearing")})` : ""
            }
          </span>
        `
      : "";
  }

  private renderExtrema(): TemplateResult | string {
    const high = this.custom.high?.state ?? this.weather?.high;
    const low = this.custom.low?.state ?? this.weather?.low;
    return high || low
      ? html`
          <span class="weather__info__item">
            ${this.renderAttr("low")} ${high && low ? " / " : ""}
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
    if (value === undefined || value === "") return "";
    return html`
      <span class="weather__info__item">
        ${
          icon
            ? html`<div
                class="weather__icon weather__icon--small"
                style="background-image: url(${this.weather?.getIcon(icon)})"
              ></div>`
            : ""
        }
        ${this.renderAttr(attr)}
      </span>
    `;
  }

  private renderForecast(): TemplateResult {
    const isHourly = this.config.forecast_type === "hourly";
    const entries = this._forecast.slice(0, 5);
    const tempUnit = this.getUnit("temperature");
    const lang = this.hass.locale.language;
    return html`
      <div class="weather__forecast">
        ${entries.map((entry) => {
          const date = entry.datetime ? new Date(entry.datetime) : null;
          const label = date
            ? isHourly
              ? date.toLocaleTimeString(lang, {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })
              : date.toLocaleDateString(lang, { weekday: "short" })
            : "";
          const icon = entry.condition
            ? this._getIcon(entry.condition)
            : undefined;
          return html`
            <div class="weather__forecast__day">
              <span class="weather__forecast__dayname">${label}</span>
              ${
                icon
                  ? html`<div
                      class="weather__icon weather__icon--forecast"
                      style="background-image: url(${icon})"
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
                !isHourly
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
    const weatherValue = this.weather?.getAttribute(attr);
    const state = this.custom[attr] ? this.custom[attr].state : weatherValue;
    if (!state && state !== 0) return undefined;
    const unit = this.custom[attr]?.unit ?? INFO[attr]?.unit;
    return html` ${state} ${uom ? this.getUnit(unit) : ""} `;
  }

  private handleTap(): void {
    handleClick(this, this.config);
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

import clear_night from "../icons/clear_night.png";
import cloudy from "../icons/cloudy.png";
import fog from "../icons/fog.png";
import lightning from "../icons/lightning.png";
import storm from "../icons/storm.png";
import storm_night from "../icons/storm_night.png";
import mostly_cloudy from "../icons/mostly_cloudy.png";
import mostly_cloudy_night from "../icons/mostly_cloudy_night.png";
import heavy_rain from "../icons/heavy_rain.png";
import rainy from "../icons/rainy.png";
import snowy from "../icons/snowy.png";
import mixed_rain from "../icons/mixed_rain.png";
import sunny from "../icons/sunny.png";
import windy from "../icons/windy.svg";
import humidity from "../icons/humidity.svg";
import pressure from "../icons/pressure.svg";
import animated_clear_night from "../icons/animated/clear-night.svg";
import animated_cloudy from "../icons/animated/cloudy.svg";
import animated_fog from "../icons/animated/fog.svg";
import animated_hail from "../icons/animated/hail.svg";
import animated_storm from "../icons/animated/storm.svg";
import animated_lightning from "../icons/animated/lightning.svg";
import animated_mostly_cloudy from "../icons/animated/mostly_cloudy.svg";
import animated_heavy_rain from "../icons/animated/heavy_rain.svg";
import animated_rainy from "../icons/animated/rainy.svg";
import animated_mixed_rain from "../icons/animated/mixed_rain.svg";
import animated_snowy from "../icons/animated/snowy.svg";
import animated_sunny from "../icons/animated/sunny.svg";
import animated_windy from "../icons/animated/windy.svg";
import animated_windy_variant from "../icons/animated/windy-variant.svg";

import {
  HomeAssistant,
  HassEntity,
  HassEntityAttributes,
  ForecastEntry,
} from "./types";

const ICONS: Record<string, string> = {
  "clear-day": sunny,
  "clear-night": clear_night,
  cloudy,
  overcast: cloudy,
  fog,
  hail: mixed_rain,
  lightning,
  "lightning-rainy": storm,
  exceptional: storm,
  "partly-cloudy-day": mostly_cloudy,
  "partly-cloudy-night": mostly_cloudy_night,
  partlycloudy: mostly_cloudy,
  pouring: heavy_rain,
  rain: rainy,
  rainy,
  sleet: mixed_rain,
  snow: snowy,
  snowy,
  "snowy-rainy": mixed_rain,
  sunny,
  wind: windy,
  windy,
  "windy-variant": windy,
  humidity,
  pressure,
};

const ICONS_NIGHT: Record<string, string> = {
  ...ICONS,
  sunny: clear_night,
  partlycloudy: mostly_cloudy_night,
  "lightning-rainy": storm_night,
};

const ICONS_ANIMATED: Record<string, string> = {
  "clear-day": animated_sunny,
  "clear-night": animated_clear_night,
  cloudy: animated_cloudy,
  overcast: animated_cloudy,
  fog: animated_fog,
  hail: animated_hail,
  lightning: animated_lightning,
  "lightning-rainy": animated_storm,
  exceptional: animated_storm,
  "partly-cloudy-day": animated_mostly_cloudy,
  "partly-cloudy-night": animated_mostly_cloudy,
  partlycloudy: animated_mostly_cloudy,
  pouring: animated_heavy_rain,
  rain: animated_rainy,
  rainy: animated_rainy,
  sleet: animated_mixed_rain,
  snow: animated_snowy,
  snowy: animated_snowy,
  "snowy-rainy": animated_mixed_rain,
  sunny: animated_sunny,
  wind: animated_windy,
  windy: animated_windy,
  "windy-variant": animated_windy_variant,
  humidity,
  pressure,
};

const ICONS_ANIMATED_NIGHT: Record<string, string> = {
  ...ICONS_ANIMATED,
  sunny: animated_clear_night,
  partlycloudy: animated_cloudy,
  "partly-cloudy-night": animated_cloudy,
};

// The time zone to show times in: the server's when the user chose that in
// their profile, otherwise the browser's
export const getTimeZone = (hass: HomeAssistant): string | undefined =>
  hass.locale.time_zone === "server" ? hass.config.time_zone : undefined;

const DIRECTION = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
];

export default class WeatherEntity {
  private hass: HomeAssistant;
  private entity: HassEntity;
  private attr: HassEntityAttributes;
  private forecast: ForecastEntry[];

  constructor(
    hass: HomeAssistant,
    entity: HassEntity,
    forecast: ForecastEntry[] = [],
  ) {
    this.hass = hass;
    this.entity = entity;
    this.attr = entity.attributes;
    this.forecast = forecast.length > 0 ? forecast : [{}];
  }

  get state(): string {
    return this.toLocale(
      "component.weather.entity_component._.state." + this.entity.state,
      this.entity.state,
    );
  }

  get hasState(): boolean {
    return Boolean(this.entity.state) && this.entity.state !== "unknown";
  }

  get temp(): number | undefined {
    return this.attr.temperature;
  }

  get apparent_temperature(): number | undefined {
    return this.attr.apparent_temperature;
  }

  get name(): string | undefined {
    return this.attr.friendly_name;
  }

  get high(): number | undefined {
    return this.forecast[0]?.temperature;
  }

  get low(): number | undefined {
    return this.forecast[0]?.templow;
  }

  get wind_speed(): number | undefined {
    return this.attr.wind_speed;
  }

  get pressure(): number | undefined {
    return this.attr.pressure;
  }

  get wind_bearing(): string | undefined {
    const bearing = this.attr.wind_bearing;
    return bearing != null ? this.degToDirection(bearing) : undefined;
  }

  get precipitation(): number | undefined {
    const precipitation = this.forecast[0]?.precipitation;
    return precipitation != null
      ? Math.round(precipitation * 100) / 100
      : undefined;
  }

  get precipitation_probability(): number | undefined {
    return this.forecast[0]?.precipitation_probability;
  }

  get humidity(): number | undefined {
    return this.attr.humidity;
  }

  get isNight(): boolean {
    return this.hass.states["sun.sun"]?.state === "below_horizon";
  }

  get icon(): string | undefined {
    return this.getIcon(this.entity.state.toLowerCase(), this.isNight);
  }

  get iconAnimated(): string | undefined {
    return this.getAnimatedIcon(this.entity.state.toLowerCase(), this.isNight);
  }

  getIcon(icon: string, night = false): string {
    return (night ? ICONS_NIGHT : ICONS)[icon];
  }

  getAnimatedIcon(icon: string, night = false): string {
    return (night ? ICONS_ANIMATED_NIGHT : ICONS_ANIMATED)[icon];
  }

  // Whether a forecast entry is at night. Uses `is_daytime` when the
  // integration provides it, otherwise the time of day of the next sunrise
  // and sunset (which shift only minutes from day to day).
  isNightAt(entry: ForecastEntry): boolean {
    if (entry.is_daytime !== undefined) return !entry.is_daytime;
    const sun = this.hass.states["sun.sun"]?.attributes;
    if (!entry.datetime || !sun?.next_rising || !sun?.next_setting) {
      return false;
    }
    const format = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
      timeZone: getTimeZone(this.hass),
    });
    const minutes = (date: string): number => {
      const parts = format.formatToParts(new Date(date));
      const part = (type: string): number =>
        Number(parts.find((p) => p.type === type)?.value);
      return part("hour") * 60 + part("minute");
    };
    const time = minutes(entry.datetime);
    const sunrise = minutes(sun.next_rising as string);
    const sunset = minutes(sun.next_setting as string);
    return sunrise < sunset
      ? time < sunrise || time >= sunset
      : time >= sunset && time < sunrise;
  }

  getAttribute(attr: string): string | number | undefined {
    return (this as unknown as Record<string, string | number | undefined>)[
      attr
    ];
  }

  toLocale(string: string, fallback = "unknown"): string {
    return this.hass.localize(string) || fallback;
  }

  // Translated by Home Assistant, like its own weather card (NØ in Norwegian)
  degToDirection(deg: number): string {
    const dir = DIRECTION[Math.floor(deg / 22.5 + 0.5) % 16];
    return this.toLocale(
      `ui.card.weather.cardinal_direction.${dir.toLowerCase()}`,
      dir,
    );
  }
}

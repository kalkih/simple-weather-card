import clear_night from '../icons/clear_night.png';
import cloudy from '../icons/cloudy.png';
import fog from '../icons/fog.png';
import lightning from '../icons/lightning.png';
import storm from '../icons/storm.png';
import storm_night from '../icons/storm_night.png';
import mostly_cloudy from '../icons/mostly_cloudy.png';
import mostly_cloudy_night from '../icons/mostly_cloudy_night.png';
import heavy_rain from '../icons/heavy_rain.png';
import rainy from '../icons/rainy.png';
import snowy from '../icons/snowy.png';
import mixed_rain from '../icons/mixed_rain.png';
import sunny from '../icons/sunny.png';
import windy from '../icons/windy.svg';
import humidity from '../icons/humidity.svg';
import pressure from '../icons/pressure.svg';

const ICONS = {
  "clear-day": sunny,
  "clear-night": clear_night,
  cloudy,
  overcast: cloudy,
  fog,
  hail: mixed_rain,
  lightning,
  "lightning-rainy": storm,
  "partly-cloudy-day": mostly_cloudy,
  "partly-cloudy-night": mostly_cloudy_night,
  partlycloudy: mostly_cloudy,
  pouring: heavy_rain,
  "rain": rainy,
  rainy,
  "sleet": mixed_rain,
  "snow": snowy,
  snowy,
  "snowy-rainy": mixed_rain,
  sunny,
  "wind": windy,
  windy,
  "windy-variant": windy,
  humidity,
  pressure
};

const ICONS_NIGHT = {
  ...ICONS,
  sunny: clear_night,
  partlycloudy: mostly_cloudy_night,
  "lightning-rainy": storm_night,
}

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
]

export default class WeatherEntity {
  constructor(hass, entity) {
    this.hass = hass;
    this.entity = entity;
    this.attr = entity.attributes;
    this.forecast = entity.attributes.forecast || [[]];
  }

  get state() {
    return this.toLocale('component.weather.state._.' + this.entity.state, this.entity.state);
  }

  get hasState() {
    return (this.entity.state && this.entity.state !== 'unknown')
  }

  get temp() {
    return this.attr.temperature;
  }

  get name() {
    return this.attr.friendly_name;
  }

  get high() {
    return this.forecast[0].temperature;
  }

  get low() {
    return this.forecast[0].templow;
  }

  get wind_speed() {
    return this.attr.wind_speed || 0;
  }

  get pressure() {
    return this.attr.pressure || 0;
  }

  get wind_bearing() {
    return this.attr.wind_bearing
      ? this.degToDirection(this.attr.wind_bearing)
      : this.toLocale('state.default.unknown');
  }

  get precipitation() {
    return this.forecast[0].precipitation || 0;
  }

  get precipitation_probability() {
    return this.forecast[0].precipitation_probability || 0;
  }

  get humidity() {
    return this.attr.humidity || 0;
  }

  get isNight() {
    return this.hass.states['sun.sun']
      ? this.hass.states['sun.sun'].state === 'below_horizon'
      : false;
  }

  get icon() {
    const state = this.entity.state.toLowerCase();
    return this.isNight ? ICONS_NIGHT[state] : ICONS[state];
  }

  getIcon (icon) {
    return ICONS[icon];
  }

  toLocale(string, fallback = 'unknown') {
    const lang = this.hass.selectedLanguage || this.hass.language;
    const resources = this.hass.resources[lang];
    return (resources && resources[string] ? resources[string] : fallback);
  }

  degToDirection (deg) {
    const dir = Math.floor((deg / 22.5) + .5);
    return DIRECTION[(dir % 16)];
  }
}

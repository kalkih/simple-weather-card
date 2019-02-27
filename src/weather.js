import clear_night from '../icons/clear_night.png';
import cloudy from '../icons/cloudy.png';
import fog from '../icons/fog.png';
import thunder from '../icons/thunder.png';
import storm from '../icons/storm.png';
import storm_night from '../icons/storm_night.png';
import mostly_cloudy from '../icons/mostly_cloudy.png';
import mostly_cloudy_night from '../icons/mostly_cloudy_night.png';
import heavy_rain from '../icons/heavy_rain.png';
import rain from '../icons/rain.png';
import snow from '../icons/snow.png';
import mixed_rain from '../icons/mixed_rain.png';
import clear from '../icons/clear.png';
import wind from '../icons/windy.svg';

const ICONS = {
  "clear-night": clear_night,
  cloudy: cloudy,
  fog: fog,
  hail: mixed_rain,
  lightning: thunder,
  "lightning-rainy": storm,
  partlycloudy: mostly_cloudy,
  pouring: heavy_rain,
  rainy: rain,
  snowy: snow,
  "snowy-rainy": mixed_rain,
  sunny: clear,
  windy: wind,
  "windy-variant": wind,
};

const ICONS_NIGHT = {
  ...ICONS,
  sunny: clear_night,
  partlycloudy: mostly_cloudy_night,
  "lightning-rainy": storm_night,
}

export default class WeatherEntity {
  constructor(hass, entity) {
    this.hass = hass;
    this.entity = entity;
    this.attr = entity.attributes;
    this.forecast = entity.attributes.forecast;
  }

  get state() {
    return this.translation('state.weather.' + this.entity.state, this.entity.state);
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

  get wind() {
    return this.attr.wind_speed;
  }

  get rain() {
    return this.forecast[0].precipitation;
  }

  get isNight() {
    return this.hass.states['sun.sun']
      ? this.hass.states['sun.sun'].state === 'below_horizon'
      : false;
  };

  get icon() {
    const state = this.entity.state.toLowerCase();
    return this.isNight ? ICONS_NIGHT[state] : ICONS[state];
  }

  getIcon (icon) {
    return ICONS[icon];
  }

  translation(string, fallback = 'unknown') {
    const lang = this.hass.selectedLanguage || this.hass.language;
    const resources = this.hass.resources[lang];
    return (resources && resources[string] ? resources[string] : fallback);
  }
}

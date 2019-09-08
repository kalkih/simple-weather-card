import WeatherEntity from './weather';
import style from './style';
import { handleClick } from './handleClick';

const LitElement = window.LitElement || Object.getPrototypeOf(
  customElements.get("hui-view"),
);
const { html, css } = LitElement.prototype;

const UNITS = {
  celsius: '°C',
  fahrenheit: '°F',
}

const INFO = {
  precipitation: { icon: 'rainy', unit: 'length' },
  humidity: { icon: 'humidity', unit: '%' },
  wind_speed: { icon: 'windy', unit: 'speed' },
  wind_bearing: { icon: 'windy', unit: '' },
}

class SimpleWeatherCard extends LitElement {
  constructor () {
    super();
    this.custom = {};
  }

  static get properties() {
    return {
      _hass: { type: Object },
      config: { type: Object },
      entity: { type: Object },
      weather: { type: Object },
      custom: { type: Object },
    };
  }

  static get styles() {
    return style(css);
  }

  set hass(hass) {
    const { custom, entity } = this.config

    this._hass = hass;
    const entityObj = hass.states[entity];
    if (entityObj && this.entity !== entityObj) {
      this.entity = entityObj;
      this.weather = new WeatherEntity(hass, entityObj);
    }
    const newCustom = {};
    custom.forEach(ele => {
      const [key, sensor] = Object.entries(ele)[0]
      if (
        hass.states[sensor]
        && hass.states[sensor].state !== this.custom[key]
      ) {
        newCustom[key] = hass.states[sensor].state;
      }
    });
    if (Object.entries(newCustom).length > 0 ) {
      this.custom = {
        ...this.custom,
        ...newCustom,
      }
    }
  }

  get hass() { return this._hass; }

  get name() {
    return this.config.name || this.weather.name;
  }

  setConfig(config) {
    if (!config.entity)
      throw new Error('Specify an entity.');

    this.config = {
      bg: config.backdrop ? true : false,
      secondary_info: 'precipitation',
      custom: [],
      tap_action: {
        action: 'more-info',
      },
      ...config,
      backdrop: {
        day: '#45aaf2',
        night: '#a55eea',
        text: 'var(--text-dark-color)',
        fade: false,
        ...config.backdrop,
      },
    };
  }

  shouldUpdate(changedProps) {
    return changedProps.has('entity', 'custom');
  }

  render() {
    return html`
      <ha-card
        ?bg=${this.config.bg}
        ?fade=${this.config.backdrop.fade}
        ?night=${this.weather.isNight}
        style="--day-color: ${this.config.backdrop.day}; --night-color: ${this.config.backdrop.night}; --text-color: ${this.config.backdrop.text};"
        @click=${(e) => this.handleTap(e)}>
        ${this.renderIcon()}
        <div class="weather__info">
          <span class="weather__info__title">
            ${this.custom.temp || this.weather.temp}
            ${this.getUnit()}
            ${this.name}
          </span>
          <span class="weather__info__state">
            ${this.custom.state || this.weather.state}
          </span>
        </div>
        <div class="weather__info weather__info--add">
          ${this.renderExtrema(
            this.custom.high || this.weather.high,
            this.custom.low || this.weather.low
          )}
          <span>
            ${this.renderSecondaryInfo(this.config.secondary_info)}
          </span>
        </div>
      </ha-card>
    `;
  }

  renderIcon() {
    const icon = this.custom['icon-state']
      ? this.weather.getIcon(this.custom['icon-state'])
      : this.weather.icon
    return this.weather.hasState && icon ? html`
      <div class="weather__icon"
        style="background-image: url(${icon})">
      </div>
    ` : '';
  }

  renderExtrema(high, low) {
    return (high || low) ? html`
    <span>
      ${high ? high + this.getUnit(): ''}
      ${(high && low) ? ' / ' : ''}
      ${low ? low + this.getUnit(): ''}
    </span>
    ` : '';
  }

  renderSecondaryInfo(type) {
    return html`
      <div class="weather__icon weather__icon--small"
        style="background-image: url(${this.weather.getIcon(INFO[type].icon)})">
      </div>
      ${this.custom[type] || this.weather[type]} ${this.getUnit(INFO[type].unit)}
    `;
  }

  handleTap() {
    handleClick(this, this._hass, this.config, this.config.tap_action)
  }

  getUnit(unit = 'temperature') {
    const target = unit === 'speed' ? 'length' : unit;
    const res = this._hass.config.unit_system[target];
    if (unit === 'temperature')
      return res || UNITS.celsius;
    else if (unit === 'length')
      return res === 'km' ? 'mm' : 'in';
    else if (unit === 'speed')
      return res ? `${res}/h` : 'km/h';
    return unit;
  }
}

customElements.define('simple-weather-card', SimpleWeatherCard);

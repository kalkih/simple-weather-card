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
  precipitation_probability: { icon: 'rainy', unit: '%' },
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
      if (hass.states[sensor]) {
        const entry = hass.states[sensor];
        const { state } = this.custom[key] || {}
        if (state !== entry.state) {
          newCustom[key] = {
            state: entry.state,
            unit: entry.attributes.unit_of_measurement,
          }
        }
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
      primary_info: ['extrema'],
      secondary_info: ['precipitation'],
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

    if (typeof config.primary_info === 'string')
      this.config.primary_info = [config.primary_info];

    if (typeof config.secondary_info === 'string')
      this.config.secondary_info = [config.secondary_info];

    if (!this.config.primary_info)
      this.config.primary_info = [];

    if (!this.config.secondary_info)
      this.config.secondary_info = [];
  }

  shouldUpdate(changedProps) {
    return ['entity', 'custom'].some(prop => changedProps.has(prop))
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
            ${this.renderAttr('temp')}
            ${this.name}
          </span>
          <span class="weather__info__state">
            ${this.renderAttr('state', false)}
          </span>
        </div>
        <div class="weather__info weather__info--add">
          ${this.renderInfoRow(this.config.primary_info)}
          ${this.renderInfoRow(this.config.secondary_info)}
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

  renderExtrema() {
    const high = this.custom.high || this.weather.high;
    const low = this.custom.low || this.weather.low;
    return (high || low) ? html`
      <span class="weather__info__item">
        ${this.renderAttr('low')}
        ${(high && low) ? ' / ' : ''}
        ${this.renderAttr('high')}
      </span>
    ` : '';
  }

  renderInfoRow(attrs) {
    return html`
      <div class="weather__info__row">
        ${attrs.map(attr => this.renderInfo(attr))}
      </div>
    `;
  }

  renderInfo(attr) {
    if (attr === 'extrema') return this.renderExtrema();
    return html`
      <span class="weather__info__item">
        <div class="weather__icon weather__icon--small"
          style="background-image: url(${this.weather.getIcon(INFO[attr].icon)})">
        </div>
        ${this.renderAttr(attr)}
      </span>
    `;
  }

  renderAttr(attr, uom = true) {
    const state = this.custom[attr] ? this.custom[attr].state : this.weather[attr];
    if (!state && state !== 0) return;
    const { unit } = this.custom[attr] && this.custom[attr].unit
      ? this.custom[attr]
      : INFO[attr] || {};

    return html`
      ${state}
      ${uom ? this.getUnit(unit) : ''}
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

import WeatherEntity from './weather';
import style from './style';

const LitElement = window.LitElement || Object.getPrototypeOf(
  customElements.get("home-assistant-main"),
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
}

class SimpleWeatherCard extends LitElement {
  static get properties() {
    return {
      _hass: { type: Object },
      config: { type: Object },
      entity: { type: Object },
      weather: { type: Object },
    };
  }

  static get styles() {
    return style(css);
  }

  set hass(hass) {
    this._hass = hass;
    const entity = hass.states[this.config.entity];
    if (entity && this.entity !== entity) {
      this.entity = entity;
      this.weather = new WeatherEntity(hass, entity);
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
    return changedProps.has('entity');
  }

  render() {
    return html`
      <ha-card
        ?bg=${this.config.bg}
        ?fade=${this.config.backdrop.fade}
        ?night=${this.weather.isNight}
        style="--day-color: ${this.config.backdrop.day}; --night-color: ${this.config.backdrop.night}; --text-color: ${this.config.backdrop.text};"
        @click=${() => this.moreInfo()}>
        ${this.renderIcon()}
        <div class="weather__info">
          <span class="weather__info__title">
            ${this.weather.temp}
            ${this.getUnit()}
            ${this.name}
          </span>
          <span class="weather__info__state">
            ${this.weather.state}
          </span>
        </div>
        <div class="weather__info weather__info--add">
          ${this.renderExtrema(this.weather.high, this.weather.low)}
          <span>
            ${this.renderSecondaryInfo(this.config.secondary_info)}
          </span>
        </div>
      </ha-card>
    `;
  }

  renderIcon() {
    return this.weather.hasState ? html`
      <div class="weather__icon"
        style="background-image: url(${this.weather.icon})">
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
      ${this.weather[type]} ${this.getUnit(INFO[type].unit)}
    `;
  }

  moreInfo() {
    const e = new Event('hass-more-info', { composed: true });
    e.detail = { entityId: this.config.entity };
    this.dispatchEvent(e);
  }

  getUnit(unit = 'temperature') {
    const target = unit === 'speed' ? 'length' : unit;
    const res = this.hass.config.unit_system[target];
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

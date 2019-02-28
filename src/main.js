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
      ...config,
      backdrop: {
        day: '#45aaf2',
        night: '#a55eea',
        fade: true,
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
        style="--day-color: ${this.config.backdrop.day}; --night-color: ${this.config.backdrop.night}"
        @click=${() => this.moreInfo()}>
        <div class="weather__icon"
          style="background-image: url(${this.weather.icon})">
        </div>
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
          <span>
            ${this.weather.high}${this.getUnit()} / ${this.weather.low}${this.getUnit()}
          </span>
          <span>
            <div class="weather__icon weather__icon--small"
              style="background-image: url(${this.weather.getIcon('rainy')})">
            </div>
            ${this.weather.rain} ${this.getUnit('length')}
          </span>
        </div>
      </ha-card>
    `;
  }

  moreInfo() {
    const e = new Event('hass-more-info', { composed: true });
    e.detail = { entityId: this.config.entity };
    this.dispatchEvent(e);
  }

  getUnit(unit = 'temperature') {
    const res = this.hass.config.unit_system[unit];
    if (unit === 'temperature')
      return res || UNITS.celsius;
    else if (unit === 'length')
      return res === 'km' ? 'mm' : 'in';
    return unit;
  }
}

customElements.define('simple-weather-card', SimpleWeatherCard);

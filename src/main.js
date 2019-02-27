import WeatherEntity from './weather';

const LitElement = window.LitElement || Object.getPrototypeOf(
  customElements.get("home-assistant-main"),
);
const { html, css, cssLiteral } = LitElement.prototype;

const UNITS = {
  celsius: '°C',
  fahrenheit: '°F',
}

class SimpleWeatherCard extends LitElement {
  constructor() {
    super();
  }
  static get properties() {
    return {
      _hass: { type: Object },
      config: { type: Object },
      entity: { type: Object },
      weather: { type: Object },
    };
  }

  setConfig(config) {
    if (!config.entity)
      throw new Error('Specify an entity.');

    this.config = {
      bg: config.backdrop ? true : false,
      ...config,
      backdrop: {
        day: '#03A9F4',
        night: '#B58BFF',
        fade: true,
        ...config.backdrop,
      },
    };
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

  getUnit(unit = 'temperature') {
    const res = this.hass.config.unit_system[unit];
    if (unit === 'temperature')
      return res || UNITS.celsius;
    else if (unit === 'length')
      return res === 'km' ? 'mm' : 'in';
    return unit;
  }

  shouldUpdate(changedProps) {
    return changedProps.has('entity');
  }

  static get styles() {
    return css`
      ha-card {
        display: flex;
        flex-flow: row;
        align-items: center;
        padding: 16px;
        color: var(--primary-text-color, #000);
        font-weight: 500;
        transition: background: 1s;
        cursor: pointer;
      }
      ha-card[bg] {
        background: var(--day-color);
        color: var(--text-dark-color);
      }
      ha-card[bg][night] {
        background: var(--night-color);
      }
      ha-card[bg][fade] {
        background: linear-gradient(var(--day-color), transparent 250%);
      }
      ha-card[bg][fade][night] {
        background: linear-gradient(var(--night-color) 0%, transparent 300%);
      }
      .weather__icon {
        height: 40px;
        width: 40px;
        background-size: contain;
        background-repeat: no-repeat;
        flex: 0 0 40px;
        color: white;
      }
      .weather__icon--small {
        display: inline-block;
        height: 1em;
        width: 1em;
        flex: initial;
        margin: 0 .4em;
        margin-top: 4px;
      }
      .weather__info {
        display: flex;
        flex-flow: column;
        justify-content: space-between;
        margin-left: 16px;
        min-height: 42px;
        min-width: 0;
      }
      .weather__info > span {
        display: flex;
        align-items: center;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 100%;
      }
      .weather__info--add {
        padding-left: 8px;
        margin-left: auto;
        align-items: flex-end;
      }
    `;
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
            ${this.weather.name}
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
}

customElements.define('simple-weather-card', SimpleWeatherCard);

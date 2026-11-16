// Test helper: renders simple-weather-card as if it were night, by giving it
// a hass object where the sun set an hour ago and rises in eight hours.
//
//   type: custom:dev-night-card
//   condition: partlycloudy   # optional, overrides the weather state
//   ...                       # any simple-weather-card option
const HOUR = 60 * 60 * 1000;

class DevNightCard extends HTMLElement {
  setConfig(config) {
    const { type, condition, ...cardConfig } = config;
    this._condition = condition;
    customElements.whenDefined("simple-weather-card").then(() => {
      if (!this._card) {
        this._card = document.createElement("simple-weather-card");
        this.appendChild(this._card);
      }
      this._card.setConfig(cardConfig);
      this._config = cardConfig;
      if (this._hass) this.hass = this._hass;
    });
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._card) return;

    const now = Date.now();
    const sun = hass.states["sun.sun"];
    const states = {
      ...hass.states,
      "sun.sun": {
        ...sun,
        state: "below_horizon",
        attributes: {
          ...sun?.attributes,
          next_setting: new Date(now - HOUR + 24 * HOUR).toISOString(),
          next_rising: new Date(now + 8 * HOUR).toISOString(),
        },
      },
    };
    const entity = states[this._config.entity];
    if (this._condition && entity) {
      states[this._config.entity] = { ...entity, state: this._condition };
    }
    this._card.hass = { ...hass, states };
  }

  getCardSize() {
    return this._card?.getCardSize?.() ?? 2;
  }
}

customElements.define("dev-night-card", DevNightCard);

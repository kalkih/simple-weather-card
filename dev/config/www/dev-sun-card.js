// Test helper: renders simple-weather-card at a fixed time of day, by giving
// it a hass object where the sun is up or down, so day and night can be
// checked (and screenshots taken) at any time.
//
//   type: custom:dev-sun-card
//   sun: night                # day or night (default)
//   condition: partlycloudy   # optional, overrides the weather state
//   ...                       # any simple-weather-card option
const HOUR = 60 * 60 * 1000;

class DevSunCard extends HTMLElement {
  setConfig(config) {
    const { type, sun, condition, ...cardConfig } = config;
    this._night = sun !== "day";
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
      // Night: the sun set an hour ago and rises in eight hours.
      // Day: the sun rose an hour ago and sets in eight hours.
      "sun.sun": {
        ...sun,
        state: this._night ? "below_horizon" : "above_horizon",
        attributes: {
          ...sun?.attributes,
          next_setting: new Date(
            now + (this._night ? 23 : 8) * HOUR,
          ).toISOString(),
          next_rising: new Date(
            now + (this._night ? 8 : 23) * HOUR,
          ).toISOString(),
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

customElements.define("dev-sun-card", DevSunCard);

// hass.formatEntityName only accepts a card's `name` option (a user string, a
// structured name, or undefined) from HA 2026.4. Earlier versions expose the
// same helper with an incompatible signature, so feature detection is not
// enough - the version has to be checked.
const supportsEntityNames = (hass) => {
  // A hass can report a recent version without carrying the helper (a test
  // harness, or a hass that has not finished initialising), and calling it
  // then throws - so the version gate alone is not enough.
  if (!hass || typeof hass.formatEntityName !== 'function') return false;
  const version = hass && hass.config && hass.config.version;
  if (!version) return false;
  const [major, minor] = version.split(".", 2);
  return Number(major) > 2026 || (Number(major) === 2026 && Number(minor) >= 4);
};

// Resolves a `name` option against the entity's registry context (entity,
// device, area, floor). Falls back to the friendly name on older HA versions,
// where a structured name cannot be resolved.
export const computeEntityName = (hass, stateObj, name) => {
  // A configured empty name has always meant "use Home Assistant's name", but
  // formatEntityName returns any string verbatim - including the empty one, which
  // would blank the label. Normalise it to undefined so the formatter composes.
  if (name === "") name = undefined;

  const configuredName = typeof name === "string" ? name : undefined;
  if (!stateObj) return configuredName;
  if (supportsEntityNames(hass)) {
    return hass.formatEntityName(stateObj, name);
  }
  return configuredName || stateObj.attributes.friendly_name;
};

// formatEntityName resolves against the entity/device/area/floor registries, and
// HA swaps the real formatter in asynchronously once translations load. Neither
// shows up as an entity state change, so without this a rename (or that swap)
// leaves the rendered name stale until some unrelated state change forces a render.
const NAME_SOURCES = [
  "formatEntityName",
  "entities",
  "devices",
  "areas",
  "floors",
];

export const entityNamesChanged = (oldHass, newHass) => {
  if (!oldHass || !newHass) return false;
  return NAME_SOURCES.some((key) => oldHass[key] !== newHass[key]);
};

import { NormalizedConfig } from "./types";

// Hand the action over to Home Assistant, so every action type the
// tap action editor offers (perform-action, toggle, url, assist, ...) works
export const handleClick = (node: Element, config: NormalizedConfig): void => {
  // Older configs may use `perform_action`, which Home Assistant doesn't know
  const tapAction =
    config.tap_action.action === "perform_action"
      ? { ...config.tap_action, action: "perform-action" }
      : config.tap_action;
  node.dispatchEvent(
    new CustomEvent("hass-action", {
      bubbles: true,
      composed: true,
      detail: { config: { ...config, tap_action: tapAction }, action: "tap" },
    }),
  );
};

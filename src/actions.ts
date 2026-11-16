import { NormalizedConfig, TapAction } from "./types";

export type ActionType = "tap" | "hold" | "double_tap";

export const hasAction = (action?: TapAction): boolean =>
  action !== undefined && action.action !== "none";

// Hand the action over to Home Assistant, so every action type the
// action editor offers (perform-action, toggle, url, assist, ...) works
export const fireAction = (
  node: Element,
  config: NormalizedConfig,
  action: ActionType = "tap",
): void => {
  const key = `${action}_action` as const;
  const actionConfig = config[key];
  // Older configs may use `perform_action`, which Home Assistant doesn't know
  const normalized =
    actionConfig?.action === "perform_action"
      ? { ...actionConfig, action: "perform-action" }
      : actionConfig;
  node.dispatchEvent(
    new CustomEvent("hass-action", {
      bubbles: true,
      composed: true,
      detail: { config: { ...config, [key]: normalized }, action },
    }),
  );
};

export interface HassEntityAttributes {
  [key: string]: unknown;
  friendly_name?: string;
  unit_of_measurement?: string;
  temperature?: number;
  temperature_unit?: string;
  apparent_temperature?: number;
  wind_speed?: number;
  wind_speed_unit?: string;
  wind_bearing?: number;
  pressure?: number;
  pressure_unit?: string;
  humidity?: number;
  precipitation_unit?: string;
}

export interface HassEntity {
  state: string;
  attributes: HassEntityAttributes;
}

export interface HassConfig {
  unit_system: {
    temperature: string;
    length: string;
    mass: string;
    pressure: string;
    volume: string;
  };
  version: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  config: HassConfig;
  locale: { language: string };
  localize: (key: string, ...args: unknown[]) => string;
  resources: Record<string, Record<string, string>>;
  connection: {
    haVersion: string;
    subscribeMessage: <Result>(
      callback: (result: Result) => void,
      msg: Record<string, unknown>,
    ) => Promise<() => void>;
  };
  callService: (
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
  ) => void;
}

export interface ForecastEntry {
  datetime?: string;
  condition?: string;
  temperature?: number;
  templow?: number;
  apparent_temperature?: number;
  precipitation?: number;
  precipitation_probability?: number;
  is_daytime?: boolean;
}

export interface BackdropConfig {
  bg: boolean;
  day: string;
  night: string;
  text: string;
  fade: boolean;
}

export interface TapAction {
  action: string;
  entity?: string;
  navigation_path?: string;
  perform_action?: string;
  data?: Record<string, unknown>;
  target?: Record<string, unknown>;
  service?: string;
  service_data?: Record<string, unknown>;
}

export interface CardModConfig {
  style?: string;
  class?: string | string[];
}

export interface UixConfig {
  style?: string | Record<string, unknown>;
  class?: string | string[];
  debug?: boolean;
}

export interface CardConfig {
  entity: string;
  name?: string;
  show_name?: boolean;
  primary_info?: string | string[];
  secondary_info?: string | string[];
  state_content?: string;
  custom?: Array<Record<string, string>>;
  tap_action?: TapAction;
  backdrop?: Partial<BackdropConfig>;
  show_forecast?: boolean;
  forecast_type?: "daily" | "hourly";
  animated_icons?: boolean;
  card_mod?: CardModConfig;
  uix?: UixConfig;
}

export interface NormalizedConfig {
  entity: string;
  name?: string;
  show_name: boolean;
  primary_info: string[];
  secondary_info: string[];
  state_content: string;
  custom: Array<Record<string, string>>;
  tap_action: TapAction;
  backdrop: BackdropConfig;
  show_forecast: boolean;
  forecast_type: "daily" | "hourly";
  animated_icons: boolean;
  card_mod?: CardModConfig;
  uix?: UixConfig;
}

export interface CustomState {
  state: string;
  unit?: string;
}

export type CustomMap = Record<string, CustomState>;

import cs from "./translations/cs.json";
import da from "./translations/da.json";
import de from "./translations/de.json";
import en from "./translations/en.json";
import fi from "./translations/fi.json";
import hu from "./translations/hu.json";
import is from "./translations/is.json";
import lt from "./translations/lt.json";
import nb from "./translations/nb.json";
import pl from "./translations/pl.json";
import sk from "./translations/sk.json";
import sv from "./translations/sv.json";
import uk from "./translations/uk.json";
import { HomeAssistant } from "./types";

// To add a language, add src/translations/<language>.json with the same
// keys as en.json and list it here. Missing keys fall back to English.
// Nynorsk uses bokmål until it has its own translation.
const LANGUAGES: Record<string, unknown> = {
  cs,
  da,
  de,
  en,
  fi,
  hu,
  is,
  lt,
  nb,
  nn: nb,
  pl,
  sk,
  sv,
  uk,
};

const lookup = (translations: unknown, key: string): string | undefined => {
  const value = key
    .split(".")
    .reduce<unknown>(
      (obj, part) => (obj as Record<string, unknown> | undefined)?.[part],
      translations,
    );
  return typeof value === "string" ? value : undefined;
};

// Uses the user's language in Home Assistant, or its base language
// (en-GB -> en), and falls back to English
export const localize = (
  hass: HomeAssistant | undefined,
  key: string,
): string => {
  const language = hass?.locale?.language ?? "en";
  const translations = LANGUAGES[language] ?? LANGUAGES[language.split("-")[0]];
  return lookup(translations, key) ?? lookup(en, key) ?? key;
};

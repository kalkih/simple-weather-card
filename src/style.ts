import { css, CSSResult } from "lit";

export default function getStyles(): CSSResult {
  return css`
    ha-card {
      display: flex;
      flex-flow: column;
      padding: 16px;
      color: var(--primary-text-color, #000);
      font-weight: var(--swc-font-weight, 400);
      transition: background 1s;
    }
    ha-card[role="button"] {
      cursor: pointer;
    }
    ha-card:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .weather__main {
      display: flex;
      flex-flow: row;
      align-items: center;
      width: 100%;
    }
    ha-card[bg] {
      font-weight: var(--swc-font-weight, 500);
      background: var(--day-color);
      color: var(--text-color);
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
      margin-right: 16px;
    }
    .weather__icon--small {
      display: inline-block;
      height: 1em;
      width: 1em;
      min-width: 1em;
      flex: initial;
      margin: 0 0.2em;
    }
    .weather__info {
      display: flex;
      flex-flow: column;
      justify-content: space-between;
      min-height: 42px;
      min-width: 0;
    }
    .weather__info__row {
      display: flex;
      align-items: center;
      max-width: 100%;
    }
    .weather__info__item {
      padding-left: 8px;
      display: flex;
      align-items: center;
    }
    .weather__info__state .weather__info__item {
      padding-left: 0;
    }
    .weather__info--add {
      padding-left: 8px;
      margin-left: auto;
      align-items: flex-end;
    }
    .weather__info__state,
    .weather__info__title,
    .weather__info__row {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .weather__forecast {
      display: flex;
      flex-flow: row;
      justify-content: space-around;
      width: 100%;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
    }
    ha-card[bg] .weather__forecast {
      border-top-color: rgba(255, 255, 255, 0.25);
    }
    .weather__forecast__day {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .weather__forecast__dayname {
      font-size: 0.75em;
      opacity: 0.7;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .weather__icon--forecast {
      height: 28px;
      width: 28px;
      flex: 0 0 28px;
      margin-right: 0;
    }
    .weather__forecast__temp {
      font-size: 0.8em;
      line-height: 1.2;
    }
    .weather__forecast__temp--low {
      opacity: 0.6;
    }
  `;
}

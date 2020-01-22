function getStyles(css) {
  return css`
    ha-card {
      display: flex;
      flex-flow: row;
      align-items: center;
      padding: 16px;
      color: var(--primary-text-color, #000);
      font-weight: var(--swc-font-weight, 400);
      transition: background 1s;
      cursor: pointer;
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
      margin: 0 .2em;
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
  `;
}

export default getStyles;

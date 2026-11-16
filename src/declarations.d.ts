// Set at build time by webpack, see webpack.config.mjs
declare const __VERSION__: string;

declare module "*.png" {
  const value: string;
  export default value;
}

declare module "*.svg" {
  const value: string;
  export default value;
}

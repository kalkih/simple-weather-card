import webpack from "webpack";

// Inline SVGs as text instead of base64. It's smaller and compresses far
// better. Only characters that break a quoted CSS url('...') are encoded.
const svgDataUrl = (content) =>
  "data:image/svg+xml," +
  encodeURIComponent(content.toString().replace(/\s+/g, " ").trim())
    .replace(/'/g, "%27")
    .replace(/%20/g, " ")
    .replace(/%3D/g, "=")
    .replace(/%3A/g, ":")
    .replace(/%2F/g, "/")
    .replace(/%3B/g, ";")
    .replace(/%2C/g, ",");

export default (env, argv) => ({
  mode: argv.mode || "production",
  devtool: argv.mode === "development" ? "inline-source-map" : false,
  entry: "./src/simple-weather-card.ts",
  output: {
    filename: "simple-weather-card.js",
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  plugins: [
    // The release workflow sets CARD_VERSION to the tag being released
    new webpack.DefinePlugin({
      __VERSION__: JSON.stringify(process.env.CARD_VERSION || "dev"),
    }),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.png$/i,
        type: "asset",
        parser: {
          dataUrlCondition: {
            maxSize: 12288,
          },
        },
      },
      {
        test: /\.svg$/i,
        type: "asset/inline",
        generator: {
          dataUrl: svgDataUrl,
        },
      },
    ],
  },
});

const path = require("path");

module.exports = {
    entry: "./src/index.ts",
    output: {
        filename: "bundle.js",
        path: path.resolve(__dirname, "dist"),
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
        fallback: { path: false, fs: false }, // These are currently necessary to ignore Node.js modules in ammo.js
    },
    module: {
        rules: [{ test: /\.tsx?$/, loader: "ts-loader" }],
    },
};

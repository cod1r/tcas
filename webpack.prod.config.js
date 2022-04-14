const NodePolyfillPlugin = require("node-polyfill-webpack-plugin")
const path = require("path");
module.exports = {
	mode: "production",
	entry: "./src/index.js",
	plugins: [
		new NodePolyfillPlugin()
  ],
	output: {
		filename: "index.js",
		path: path.resolve("build")
	}
};

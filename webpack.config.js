const path = require("path");

module.exports = {
    entry: {
        background: "./src/background.js",
        content: "./src/content.js",
        communication: "./src/communication.js",
        options: "./src/options.js"
    },
    output: {
        path: path.resolve(__dirname, "addon"),
        filename: "[name].js"
    }
};

const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const reactNativeMapsStub = path.resolve(__dirname, "stubs/react-native-maps.js");

config.resolver = config.resolver ?? {};
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react-native-maps" && platform === "web") {
    return { filePath: reactNativeMapsStub, type: "sourceFile" };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

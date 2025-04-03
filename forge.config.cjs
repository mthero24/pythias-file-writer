const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");
const path = require("path");
module.exports = {
  packagerConfig: {
    asar: true,
    icon: path.join(__dirname, "./src/public/pythias-logo-new-black-bg.ico"),
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        icon: path.join(__dirname, "./src/public/pythias-logo-new-black-bg.ico"),
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
    {
      name: "@electron-forge/maker-deb",
      config: {
        icon: path.join(__dirname, "./src/public/pythias-logo-new-black-bg.ico"),
      },
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {
        icon: path.join(__dirname, "./src/public/pythias-logo-new-black-bg.ico"),
      },
    },
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-auto-unpack-natives",
      config: {
        icon: path.join(__dirname, "./src/public/pythias-logo-new-black-bg"),
      },
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "mthero24",
          name: "pythias-electon-apps",
        },
        icon: "./src/public/logo-dark-50-ico",
        prerelease: false,
        draft: false,
        authToken: process.env.GITHUB_TOKEN,
      },
    },
  ],
};

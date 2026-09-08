require('dotenv').config();
const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");
const path = require("path");
module.exports = {
  packagerConfig: {
    asar: true,
    tmpdir: 'C:\\forge-tmp\\file-writer',
    icon: path.join(__dirname, "./src/public/pythias-logo-new-gold-black-bg.ico"),
    ignore: [/\.d\.ts$/, /\.d\.ts\.map$/, /\.map\.js$/, /node_modules\/.cache/, /node_modules\/@ampproject/],
    win32metadata: {
      CompanyName: 'Pythias Technologies',
      FileDescription: 'Pythias File Writer Server',
      ProductName: 'Pythias File Writer Server',
      InternalName: 'pythias-file-writer-server',
      'requested-execution-level': 'asInvoker',
    },
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        icon: path.join(__dirname, "./src/public/pythias-logo-new-gold-black-bg.ico"),
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
    {
      name: "@electron-forge/maker-deb",
      config: {
        icon: path.join(__dirname, "./src/public/pythias-logo-new-gold-black-bg.ico"),
      },
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {
        icon: path.join(__dirname, "./src/public/pythias-logo-new-gold-black-bg.ico"),
      },
    },
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-auto-unpack-natives",
      config: {
        icon: path.join(__dirname, "./src/public/pythias-logo-new-gold-black-bg.ico"),
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
          name: "pythias-file-writer",
        },
        icon: "./src/public/logo-dark-50-ico",
        prerelease: false,
        draft: false,
        authToken: process.env.GITHUB_TOKEN,
      },
    },
  ],
};

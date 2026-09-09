import "dotenv/config";
import { AutoUnpackNativesPlugin } from "@electron-forge/plugin-auto-unpack-natives";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

export default {
    packagerConfig: {
        asar: {
            // SumatraPDF must be on the real filesystem to be spawnable — not inside app.asar
            unpack: "**/node_modules/pdf-to-printer/dist/*.exe",
        },
        icon: "./src/public/pythias-logo-new-gold-black-bg",
    },
    rebuildConfig: {},
    makers: [
        {
            name: "@electron-forge/maker-squirrel",
            config: {
                iconUrl: "https://raw.githubusercontent.com/mthero24/pythias-electon-apps/main/file-writer/src/public/pythias-logo-new-gold-black-bg.ico",
                setupIcon: "./src/public/pythias-logo-new-gold-black-bg.ico",
            },
        },
        {
            name: "@electron-forge/maker-zip",
            platforms: ["darwin"],
        },
        {
            name: "@electron-forge/maker-deb",
            config: {},
        },
        {
            name: "@electron-forge/maker-rpm",
            config: {},
        },
    ],
    plugins: [
        new AutoUnpackNativesPlugin({}),
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
                prerelease: false,
                draft: false,
            },
        },
    ],
};

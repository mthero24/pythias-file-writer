import fs from "fs";
import os from "os";
import path from "node:path";
import { app } from "electron";

const settingsDir = os.homedir() + "/Documents/pythias/";
const settingsPath = settingsDir + "fwSettings.json";

const defaultSettings = { shipping: { scales: {}, printers: {} }, dtf: {}, roq: {}, labelPrinters: {}, sublimation: {}, dtgPrinters: {} };

fs.mkdirSync(settingsDir, { recursive: true });

// On first install, migrate data from legacy locations used by older versions
if (!fs.existsSync(settingsPath)) {
  const legacyPaths = [
    path.join(app.getPath('userData'), 'fwSettings.json'),
    path.join(app.getPath('userData'), 'settings.json'),
    path.join(path.dirname(app.getPath('exe')), 'fwSettings.json'),
    path.join(path.dirname(app.getPath('exe')), 'settings.json'),
  ];
  for (const legacy of legacyPaths) {
    try {
      const data = fs.readFileSync(legacy, 'utf8');
      if (data && data.trim()) {
        fs.writeFileSync(settingsPath, data, { encoding: 'utf8', flag: 'w' });
        fs.renameSync(legacy, legacy + '.migrated');
        break;
      }
    } catch { /* not found at this path, try next */ }
  }
}

let rawSettings;
try {
  rawSettings = fs.readFileSync(settingsPath, "utf8");
} catch {
  fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings), { encoding: "utf8", flag: "w" });
  rawSettings = JSON.stringify(defaultSettings);
}

let useSettings = JSON.parse(rawSettings);

export const getSettings = async () => useSettings;

export const updateSettings = async (sett) => {
  useSettings = sett;
  fs.writeFileSync(settingsPath, JSON.stringify(sett), { encoding: "utf8", flag: "w" });
  return { error: false, settings: useSettings };
};

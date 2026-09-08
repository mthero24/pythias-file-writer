import express from "express";
import fs from "node:fs/promises";
import os from "os";
import Jimp from "jimp";
import { execFile as _execFile } from "node:child_process";
import { promisify } from "node:util";
const execFile = promisify(_execFile);
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync } from "node:fs";
import { getSettings, updateSettings } from "../functions/settings.js";
import { getWeightForStation, restartScales } from "../functions/scales.js";

const __routes = dirname(fileURLToPath(import.meta.url));
// Use SumatraPDF bundled with pdf-to-printer (already a dependency) — avoids util.promisify
let _sumatra = join(__routes, "../../node_modules/pdf-to-printer/dist/SumatraPDF-3.4.6-32.exe");
if (_sumatra.includes("app.asar")) _sumatra = _sumatra.replace("app.asar", "app.asar.unpacked");

async function printPDF(filePath, { printer, printSettings } = {}) {
  const args = printer ? ["-print-to", printer] : ["-print-to-default"];
  args.push("-silent");
  if (printSettings) args.push("-print-settings", printSettings);
  args.push(filePath);
  await execFile(_sumatra, args);
}

const router = express.Router();
const desktopPath = join(os.homedir(), "Documents", "pythias");
// Ensure the output directory exists at startup
try { mkdirSync(desktopPath, { recursive: true }); } catch {}

let lastFileWritten = "Waiting for file to write";

export const getLastFileWritten = () => lastFileWritten;

router.get("/", (req, res) => {
  res.render("index", { lastFileWritten });
});

router.get("/settings", async (req, res) => {
  const settings = await getSettings();
  res.render("settings", { settings });
});

router.post("/settings", async (req, res) => {
  const settings = await getSettings();
  // Some values (e.g. scaleDevices) are stored as JSON arrays
  let value = req.body.path;
  if (typeof value === "string" && (value.startsWith("[") || value.startsWith("{"))) {
    try { value = JSON.parse(value); } catch {}
  }
  settings[req.body.name] = value;
  await updateSettings(settings);
  // If scale config changed, reconnect immediately
  if (req.body.name === "scaleDevices") restartScales();
  res.send({ error: false });
});

router.get("/update", (req, res) => {
  res.send({ lastFileWritten });
});

router.post("/", async (req, res) => {
  const settings = await getSettings();
  try {
    for (const f of req.body.files) {
      if (f.type === "png" || f.type === "jpg") {
        const buffer = Buffer.from(f.buffer, "binary");
        const trimmedBase64 = buffer.toString("base64");
        await fs.writeFile(`${settings["dtf"]}/${req.body.sku}.${f.type}`, trimmedBase64, "base64");
        lastFileWritten = `${req.body.sku}.${f.type}`;
      }
    }
    res.send({ error: false, msg: "file written" });
  } catch (e) {
    console.error(e);
    res.send({ error: true, msg: String(e) });
  }
});

router.post("/embroidery", async (req, res) => {
  const settings = await getSettings();
  try {
    for (const f of req.body.files) {
      await fs.writeFile(`${settings["embroidery"]}/${req.body.sku}.${f.type}`, Buffer.from(f.buffer), "base64");
      lastFileWritten = `${req.body.sku}.${f.type}`;
    }
    res.send({ error: false, msg: "file written" });
  } catch (e) {
    console.error(e);
    res.send({ error: true, msg: String(e) });
  }
});

router.post("/roq", async (req, res) => {
  const settings = await getSettings();
  const { barcode, labelType, roqNew, label, quantity, pause, QuantityToStack, Recipe, sleeves, body, exit: exitVal } = req.body;

  let content;
  if (labelType !== "pdf") {
    content = roqNew
      ? `${barcode};;;;;;${QuantityToStack};${barcode}-label.zpl;${Recipe}.xml;${exitVal};${quantity}`
      : `${barcode};${barcode}-label.zpl;;;;;${quantity};;;${pause};${QuantityToStack};${Recipe};${sleeves};${body};${exitVal}`;
  } else {
    const labelFile = label ? `${barcode}-label.pdf` : `${barcode}-label.zpl`;
    content = roqNew
      ? `${barcode};;;;;;${QuantityToStack};${barcode}-label.pdf;${Recipe}.xml;${exitVal};${quantity}`
      : `${barcode};${labelFile};;;;;${quantity};;;${pause};${QuantityToStack};${Recipe};${sleeves};${body};${exitVal}`;
  }

  try {
    if (labelType !== "pdf") {
      const buffer = label ? Buffer.from(label, "base64") : null;
      await fs.writeFile(`${settings["roq"]}/${barcode}-label.zpl`, buffer ?? "no label");
      await fs.writeFile(`${settings["roq"]}/${barcode}-!pdf-labelType.csv`, content);
      lastFileWritten = `${barcode}-label.zpl & ${barcode}.csv`;
    } else if (label) {
      const buffer = Buffer.from(label, "base64");
      await fs.writeFile(`${settings["roq"]}/${barcode}-label.pdf`, buffer);
      await fs.writeFile(`${settings["roq"]}/${barcode}-pdf-labelType.csv`, content);
      lastFileWritten = `${barcode}-label.pdf & ${barcode}.csv`;
    } else {
      await fs.writeFile(`${settings["roq"]}/${barcode}-label.zpl`, "no label");
      await fs.writeFile(`${settings["roq"]}/${barcode}-pdfLabelType-no-label.csv`, content);
      lastFileWritten = `${barcode}-label.zpl & ${barcode}.csv`;
    }
    res.send({ error: false, msg: "files written" });
  } catch (e) {
    console.error(e);
    res.send({ error: true, msg: String(e) });
  }
});

router.post("/print-shipping", async (req, res) => {
  const settings = await getSettings();
  const printerName = settings["shippingLabelPrinter"];
  const buffer = Buffer.from(req.body.label, "base64");
  const filePath = join(desktopPath, `${req.body.barcode}-label.pdf`);
  try {
    await fs.writeFile(filePath, buffer);
    await printPDF(filePath, { printer: printerName, printSettings: "fit" });
    lastFileWritten = `${req.body.barcode}-label.pdf`;
    res.send({ error: false });
  } catch (e) {
    console.error(e);
    res.send({ error: true, msg: String(e), printer: printerName });
  }
});

router.post("/print-labels", async (req, res) => {
  const settings = await getSettings();
  const printerName = settings["shippingLabelPrinter"];
  const buffer = Buffer.from(req.body.label, "base64");
  const filePath = join(desktopPath, `${req.body.barcode}-label.pdf`);
  try {
    await fs.writeFile(filePath, buffer);
    await printPDF(filePath, { printer: printerName, printSettings: "paper=My Custom Paper-100x120,fit" });
    lastFileWritten = "label.pdf";
    res.send({ error: false });
  } catch (e) {
    console.error(e);
    res.send({ error: true, msg: String(e), printer: printerName });
  }
});

router.post("/print-picklist", async (req, res) => {
  const settings = await getSettings();
  // Use printer from request body, then fall back to a dedicated picklistPrinter setting, then default printer
  const printerName = req.body.printer || settings["picklistPrinter"] || settings["shippingLabelPrinter"];
  const buffer = Buffer.from(req.body.label, "base64");
  const filePath = join(desktopPath, `picklist-${Date.now()}.pdf`);
  try {
    await fs.writeFile(filePath, buffer);
    // No custom paper size — print full-page on whatever paper is loaded in the printer
    await printPDF(filePath, { printer: printerName });
    lastFileWritten = "picklist.pdf";
    res.send({ error: false });
  } catch (e) {
    console.error(e);
    res.send({ error: true, msg: String(e), printer: printerName });
  }
});

router.get("/getweight", (req, res) => {
  const station = req.query.station ?? "station1";
  res.send(getWeightForStation(station));
});

router.post("/sublimation", async (req, res) => {
  const settings = await getSettings();
  const { folder, base64, pieceId, print: autoPrint } = req.body;
  const folderConfig = {
    "11 oz":           { ext: "pdf" },
    "15 oz":           { ext: "pdf" },
    "epson":           { ext: "pdf" },
    "stickers":        { ext: "pdf" },
    "poster-pagewide": { ext: "jpg", canPrint: true, printerKey: "posterPagewidePrinter" },
    "poster-epsonhot": { ext: "jpg", canPrint: true, printerKey: "posterEpsonPrinter" },
    "buttons":         { ext: "pdf", canPrint: true, printerKey: "buttonsPrinter" },
    "gift-messages":   { ext: "png", canPrint: true, printerKey: "giftMessagesPrinter" },
    "sawgrass":        { ext: "pdf" },
    "canvas":          { ext: req.body.ext || "tiff" },
    "pagewide":        { ext: "pdf" },
    "socks":           { ext: "png" },
  };
  try {
    const cfg = folderConfig[folder];
    if (cfg && settings[folder]) {
      const filePath = `${settings[folder]}/${pieceId}.${cfg.ext}`;
      const inputBuffer = Buffer.from(base64, "base64");
      const fileBuffer = folder === "gift-messages"
        ? await Jimp.read(inputBuffer).then(img => img.getBufferAsync(Jimp.MIME_PNG))
        : inputBuffer;
      await fs.writeFile(filePath, fileBuffer);
      lastFileWritten = `${pieceId}.${cfg.ext}`;
      const printerKey = cfg.printerKey;
      if (cfg.canPrint && autoPrint && printerKey && settings[printerKey]) {
        printPDF(filePath, { printer: settings[printerKey] })
          .catch(e => console.error(`${folder} auto-print error:`, e));
      }
    }
    res.send({ error: false, msg: "file written" });
  } catch (e) {
    console.error(e);
    res.send({ error: true, msg: String(e) });
  }
});

// ── ColDesi hot-folder route ──────────────────────────────────────────────────
// Body: { pieceId, preset, imageBase64? (PNG base64), imageUrl? }
// `preset` maps to a hot folder path configured in settings.coldesi.hotFolders
// e.g. settings.coldesi.hotFolders = { standard: "C:/HotFolders/Standard", white_ink: "C:/HotFolders/WhiteInk" }
router.post("/coldesi", async (req, res) => {
  const settings = await getSettings();
  const { pieceId, preset = "standard", imageBase64, imageUrl } = req.body;

  const hotFolder = settings.coldesi?.hotFolders?.[preset];
  if (!hotFolder) {
    return res.send({ error: true, msg: `ColDesi hot folder not configured for preset "${preset}"` });
  }

  try {
    let buffer;
    if (imageBase64) {
      buffer = Buffer.from(imageBase64, "base64");
    } else if (imageUrl) {
      const { default: axios } = await import("axios");
      const resp = await axios.get(imageUrl, { responseType: "arraybuffer" });
      buffer = Buffer.from(resp.data);
    } else {
      return res.send({ error: true, msg: "imageBase64 or imageUrl required" });
    }

    const filename = `${pieceId}.png`;
    await fs.writeFile(`${hotFolder}/${filename}`, buffer);
    lastFileWritten = filename;
    return res.send({ error: false, msg: "written to hot folder", filename, preset, hotFolder });
  } catch (e) {
    console.error("[coldesi]", e);
    return res.send({ error: true, msg: String(e) });
  }
});

export default router;
